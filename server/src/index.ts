import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import restaurantRoutes from './routes/restaurant';
import categoryRoutes from './routes/categories';
import reviewsRouter from './routes/reviews';
import authRoutes from './routes/auth';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Security // Security middleware
app.use(helmet());

// Cookie parsing middleware
app.use(cookieParser());

// Routes
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reviews', reviewsRouter);
app.use('/api/auth', authRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export { prisma };
