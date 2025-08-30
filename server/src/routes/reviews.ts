import express from 'express';
import { prisma } from '../index';

const router = express.Router();

// POST new review
router.post('/', async (req, res) => {
  try {
    const { restaurantId, rating, comment, userName, userEmail } = req.body;

    // Validation
    if (!restaurantId || !rating || !userName) {
      return res.status(400).json({
        error: 'Restaurant ID, rating, and user name are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Rating must be between 1 and 5'
      });
    }

    // Check if restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId }
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        rating,
        comment,
        restaurant: {
          connect: { id: restaurantId }
        },
        user: {
          connectOrCreate: {
            where: { email: userEmail },
            create: {
              name: userName,
              email: userEmail
            }
          }
        }
      }
    });

    // Update restaurant average rating
    const reviews = await prisma.review.findMany({
      where: { restaurantId }
    });

    const averageRating = reviews.reduce((sum: any, r: { rating: any; }) => sum + r.rating, 0) / reviews.length;

    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { rating: averageRating }
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// router.get('/', async (req, res) => {
//   try {
//     const 
//   }
// })

// GET reviews for restaurant
router.get('/restaurant/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const reviews = await prisma.review.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
