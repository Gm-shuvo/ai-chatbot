import OpenAI from 'openai';
import readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY as string,
});

const rl = readline.createInterface({
    input: process.stdin, 
    output: process.stdout,
});

type Message = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};

let conversationHistory: Message[] = [{
    role: 'system', // A system message helps guide the AI's behavior
    content: 'You are a helpful AI assistant. Be concise and polite.',
}];

async function startChat(): Promise<void> {
    // Prompt the user for their input.
    rl.question('\nYou: ', async (userInput: string) => {
        
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
        let gotChunk = false;

        try {
            const stream = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo', 
                messages: conversationHistory, 
                stream: true,
            });

            for await (const chunk of stream as any) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    process.stdout.write(content);
                    fullAiResponse += content;
                    gotChunk = true;
                }
            }

            // Always print a newline after the AI response
            process.stdout.write('\n');

            // Optionally, handle the case where nothing was streamed
            if (!gotChunk) {
                process.stdout.write('[No response received]\n');
            }

            conversationHistory.push({
                role: 'assistant',
                content: fullAiResponse,
            });

        } catch (error: any) {
            console.error('\nError during API call:', error.message);
            conversationHistory.pop();
        }
        startChat();
    });
}

console.log('Welcome to the AI Chatbot! Type "exit" or "quit" to end the conversation.');

startChat();
