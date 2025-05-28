import OpenAI from 'openai';
import readline from 'readline';
import dotenv from 'dotenv';
import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables"; // Import RunnableWithMessageHistory

dotenv.config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const chatModel = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: 'gpt-3.5-turbo',
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

// Start the chat
async function startChat(): Promise<void> {
    rl.question('\nYou: ', async (userInput: string) => {

        if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
            console.log('Goodbye! Thanks for chatting.');
            rl.close();
            return;
        }

        process.stdout.write('AI: ');

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
                    ]
                }
            );

            process.stdout.write('\n');

        } catch (error: any) {
            console.error('\nError during API call:', error.message);
        }

        startChat();
    });
}

console.log('Welcome to the AI Chatbot! Type "exit" or "quit" to end the conversation.');

startChat();
