import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = String(process.env.MONGODB_URI || '');
const mongoClient = new MongoClient(mongoUri);
let mongoConnected = false;
export async function getServicesCollection() {
    if (!mongoConnected) {
        await mongoClient.connect();
        mongoConnected = true;
    }
    return mongoClient.db().collection('services');
}