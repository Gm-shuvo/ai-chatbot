// Import necessary modules
import OpenAI from 'openai';
import readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const rl = readline.createInterface({
    input: process.stdin, 
    output: process.stdout,
});

let conversationHistory = [{
    role: 'system', // A system message helps guide the AI's behavior
    content: 'You are a helpful AI assistant. Be concise and polite.',
}];

async function startChat() {
    // Prompt the user for their input.
    rl.question('\nYou: ', async (userInput) => {
        
        if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
            console.log('Goodbye! Thanks for chatting.');
            rl.close(); 
            return;
        }

        conversationHistory.push({
            role: 'user',
            content: userInput,
        });

        process.stdout.write('AI: ');

        let fullAiResponse = '';

        try {
            const stream = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo', 
                messages: conversationHistory, 
                stream: true,
            });

            for await (const chunk of stream) {
                
                const content = chunk.choices[0]?.delta?.content || '';
                process.stdout.write(content);
                fullAiResponse += content;
            }

            conversationHistory.push({
                role: 'assistant',
                content: fullAiResponse,
            });

        } catch (error) {
            console.error('\nError during API call:', error.message);
            conversationHistory.pop();
        }
        startChat();
    });
}

console.log('Welcome to the AI Chatbot! Type "exit" or "quit" to end the conversation.');

startChat();
