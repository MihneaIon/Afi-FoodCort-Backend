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

async function testConnection() {
  try {
    const result = await prisma.$queryRaw`SELECT NOW()`;
    console.log("✅ Conexiune reușită! Timp:", result);
  } catch (err) {
    console.error("❌ Eroare la conexiune:", err);
  }
  // NOTE: do NOT call prisma.$disconnect() here. This is the single shared
  // client used by every route; disconnecting it at startup tore down the
  // connection pool the app depends on. Disconnect only on graceful shutdown.
}

testConnection();

// Graceful shutdown: close the Prisma connection pool only when the process exits.
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export { prisma };
