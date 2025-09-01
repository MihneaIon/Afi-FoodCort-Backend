import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import restaurantRoutes from './routes/restaurant';
import categoryRoutes from './routes/categories';
import reviewsRouter from './routes/reviews';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reviews', reviewsRouter);
app.get('/test', (req, res) => {
  res.send('Deployment is working!');
});
app.get("/", (req, res) => {
  res.send("Server is running!");
});


// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export { prisma };
