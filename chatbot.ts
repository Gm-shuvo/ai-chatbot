import readline from "readline";
import dotenv from "dotenv";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import { ChatOpenAI } from "@langchain/openai";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables"; // Import RunnableWithMessageHistory
import { getServicesCollection } from "./db";
import { cosineSimilarity, extractDescription } from "./utils";
import OpenAI from "openai";
import { openai } from "./openai";

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const chatModel = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "gpt-3.5-turbo",
  streaming: true,
});

const chatPrompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a helpful AI assistant. Be concise and polite."],
  new MessagesPlaceholder("chat_history"),
  ["human", "{question}"],
]);

// base chain
const baseChain = chatPrompt.pipe(chatModel);

// histories for different sessions.
const messageHistories = new Map<string, ChatMessageHistory>();

// to get or create a chat history
const getMessageHistory = async (sessionId: string) => {
  if (messageHistories.has(sessionId)) {
    return messageHistories.get(sessionId)!;
  }
  const newMemory = new ChatMessageHistory();
  messageHistories.set(sessionId, newMemory);
  return newMemory;
};

// loading and saving chat history
const conversationalChain = new RunnableWithMessageHistory({
  runnable: baseChain,
  getMessageHistory: getMessageHistory,
  inputMessagesKey: "question",
  historyMessagesKey: "chat_history",
});

// Find relevant services using vector search
async function findRelevantServices(userQuery: string, topK = 5) {
  const collection = await getServicesCollection();

  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: String(userQuery ?? ""),
  });
  const queryEmbedding = embeddingResponse.data[0].embedding;

  const services = await collection
    .find({ embedding: { $exists: true } })
    .toArray();

  const scored = services.map((service: any) => ({
    ...service,
    score: cosineSimilarity(queryEmbedding, service.embedding),
  }));
  scored.sort((a: any, b: any) => b.score - a.score);
  return scored.slice(0, topK);
}

// RAG answer function
async function answerServiceQuery(userQuery: string): Promise<string> {
  const services = await findRelevantServices(userQuery);
  if (services.length === 0) {
    return "Sorry, I couldn't find any relevant services. Would you like to see a list of all available services?";
  }
  const context = services
    .map(
      (s: any, i: number) =>
        `${i + 1}. Title: ${s.title}\n   Description: ${extractDescription(
          s.description
        ).slice(0, 100)}...\n   Cost: ${s.cost}\n   Link: ${s.link}`
    )
    .join("\n\n");
  const prompt = `\nYou are a smart marketing agent designed to help users explore a collection of services stored in a MongoDB database. Each service has a title, image, description, cost, and link.\n\nHere are the most relevant services:\n\n${context}\n\nUser Query: ${userQuery}\n\nAnswer the user's question or suggest similar services in a friendly, helpful way. If no relevant service is found, respond gracefully and suggest general options.\n`;
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
  });
  const content = completion.choices[0].message.content;
  if (!content) {
    throw new Error("No response content received from OpenAI");
  }
  return content;
}

// Start the chat
async function startChat(): Promise<void> {
  rl.question("\nYou: ", async (userInput: string) => {
    if (
      userInput.toLowerCase() === "exit" ||
      userInput.toLowerCase() === "quit"
    ) {
      console.log("Goodbye! Thanks for chatting.");
      rl.close();
      return;
    }
    if (userInput.startsWith("/service ")) {
      const query = userInput.replace("/service ", "");
      process.stdout.write("AI (Service Agent): ");
      try {
        const answer = await answerServiceQuery(query);
        process.stdout.write(`\n${answer}\n`);
      } catch (err: any) {
        process.stdout.write(`\nError: ${err.message}\n`);
      }
      startChat();
      return;
    }
    process.stdout.write("AI: ");
    try {
      const response = await conversationalChain.invoke(
        { question: userInput },
        {
          configurable: {
            sessionId: "my-fixed-session-id",
          },
          callbacks: [
            {
              handleLLMNewToken(token: string) {
                process.stdout.write(token);
              },
            },
          ],
        }
      );
      process.stdout.write("\n");
    } catch (error: any) {
      console.error("\nError during API call:", error.message);
    }
    startChat();
  });
}

console.log(
  'Welcome to the AI Chatbot! Type "exit" or "quit" to end the conversation.'
);

startChat();
