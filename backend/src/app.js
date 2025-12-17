import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import router from '../routes/user.route.js';
import errorHandler from '../middlewares/error.middleware.js';

dotenv.config();


const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));

app.use(express.json({limit: '16kb'})); // to parse JSON bodies
//Reading data from URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static("public")); // to serve static files
app.use(cookieParser()); // to parse cookies

//Router declration 

app.use("/api/v1/users", router);
app.use(errorHandler);

export default app;