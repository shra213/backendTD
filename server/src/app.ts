import express from 'express';
import fs from "fs";

// Create uploads folder if it doesn't exist


import cors from 'cors';
import dotenv from 'dotenv';
import otpRouter from './routes/otpRoutes';
import friendRouter from './routes/friends';
import userRouter from './routes/user';
import roomRouter from './routes/room';
import groupRouter from './routes/group';
import { verifyToken } from './middlewares/user';
dotenv.config();
import cookieParser from "cookie-parser";
import uploadRouter from './routes/upload';
import path from 'path';
// import { fileURLToPath } from "url";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
console.log()
const app = express();
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
console.log(__dirname);
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // ✅ Correct

app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // serve files

app.use(cookieParser());
app.get('/', (req, res) => {
  res.send('truth & dare Api running');
});

app.use('/api/upload', uploadRouter);
app.use('api/deleteFile', uploadRouter);

app.use('/api/otp', otpRouter);
app.use('/api/friends', verifyToken, friendRouter);
app.use('/api/user', userRouter);
app.use('/api/room', verifyToken, roomRouter);
app.use('/api/group', verifyToken, groupRouter);
export default app;
