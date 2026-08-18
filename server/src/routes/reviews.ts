import express from 'express';
import { prisma } from '../index';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// POST new review
router.post('/', asyncHandler(async (req, res) => {
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

    // Create the review and recompute the restaurant's average rating atomically.
    // Previously userName/userEmail were required/collected but never stored, and
    // the average was computed by loading every review into memory.
    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          restaurantId,
          rating,
          comment,
          userName,
          userEmail
        }
      });

      // Aggregate in the DB instead of loading all reviews.
      const agg = await tx.review.aggregate({
        where: { restaurantId },
        _avg: { rating: true }
      });

      await tx.restaurant.update({
        where: { id: restaurantId },
        data: { rating: agg._avg.rating ?? 0 }
      });

      return created;
    });

    res.status(201).json(review);
}));

// router.get('/', async (req, res) => {
//   try {
//     const
//   }
// })

// GET reviews for restaurant
router.get('/restaurant/:restaurantId', asyncHandler<{ restaurantId: string }>(async (req, res) => {
    const { restaurantId } = req.params;

    const reviews = await prisma.review.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(reviews);
}));

export default router;
