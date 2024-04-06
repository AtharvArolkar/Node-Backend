import dotenv from 'dotenv';
import connectDB from './db/index.js';
import { app } from './app.js';

dotenv.config({
  path: './env',
});

const PORT = process.env.PORT || 8000;
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`SERVER is running at port : ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MONGO DB connection failed !!!', error);
  });
