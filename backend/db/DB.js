import mongoose from 'mongoose';
import { DB_NAME } from '../src/constant.js';

export const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
        console.log(`MongoDB connected: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.error("MONGODB CONNECTION ERROR:" , error);
        process.exit(1);
    }
}