import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';

const connectDB = async () => {
  try {
    const connnectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(
      `Mongo DB connect !! DB HOST: ${connnectionInstance.connection.host}`
    );
  } catch (error) {
    console.error('MONGODb CONNECTION FAILED:', error);
    process.exit(1);
  }
};

export default connectDB;
