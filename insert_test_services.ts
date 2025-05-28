import { getServicesCollection } from './db';
import { openai } from './openai';
import dotenv from 'dotenv';
dotenv.config();

async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text,
  });
  return response.data[0].embedding;
}

const testServices = [
  {
    title: 'Test Service',
    description: JSON.stringify({ blocks: [{ key: 'a', text: 'This is a test service for demonstration.', type: 'unstyled', depth: 0, inlineStyleRanges: [], entityRanges: [], data: {} }], entityMap: {} }),
    cost: 40000,
    link: 'http://localhost:3000/services/test',
    imgSrc: 'https://example.com/test1.jpg',
  },
  {
    title: 'Health Checkup',
    description: JSON.stringify({ blocks: [{ key: 'b', text: 'Comprehensive health checkup including blood tests and physical examination.', type: 'unstyled', depth: 0, inlineStyleRanges: [], entityRanges: [], data: {} }], entityMap: {} }),
    cost: 25000,
    link: 'http://localhost:3000/services/health',
    imgSrc: 'https://example.com/health.jpg',
  },
  {
    title: 'Business Consulting',
    description: JSON.stringify({ blocks: [{ key: 'c', text: 'Expert business consulting for startups and enterprises.', type: 'unstyled', depth: 0, inlineStyleRanges: [], entityRanges: [], data: {} }], entityMap: {} }),
    cost: 60000,
    link: 'http://localhost:3000/services/business',
    imgSrc: 'https://example.com/business.jpg',
  },
  {
    title: 'Yoga Classes',
    description: JSON.stringify({ blocks: [{ key: 'd', text: 'Join our yoga classes to improve flexibility and reduce stress.', type: 'unstyled', depth: 0, inlineStyleRanges: [], entityRanges: [], data: {} }], entityMap: {} }),
    cost: 15000,
    link: 'http://localhost:3000/services/yoga',
    imgSrc: 'https://example.com/yoga.jpg',
  },
  {
    title: 'Digital Marketing',
    description: JSON.stringify({ blocks: [{ key: 'e', text: 'Grow your business with our digital marketing solutions.', type: 'unstyled', depth: 0, inlineStyleRanges: [], entityRanges: [], data: {} }], entityMap: {} }),
    cost: 35000,
    link: 'http://localhost:3000/services/marketing',
    imgSrc: 'https://example.com/marketing.jpg',
  },
];

async function insertTestServices() {
  const collection = await getServicesCollection();
  for (const service of testServices) {
    const descText = JSON.parse(service.description).blocks.map((b: any) => b.text).join(' ');
    const embedding = await getEmbedding(descText);
    await collection.insertOne({
      ...service,
      embedding,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`Inserted: ${service.title}`);
  }
  console.log('All test services inserted.');
  process.exit(0);
}

insertTestServices().catch(err => {
  console.error('Error inserting test services:', err);
  process.exit(1);
}); 