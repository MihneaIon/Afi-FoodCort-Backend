import express from 'express';
import { prisma } from '../index';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { CreateReviewBody } from '../types/dto';

const router = express.Router();

// POST new review
router.post('/', asyncHandler<unknown, unknown, CreateReviewBody>(async (req, res) => {
    const { restaurantId, rating, comment, userName, userEmail } = req.body;

    // Validation
    if (!restaurantId || !rating || !userName) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Restaurant ID, rating, and user name are required');
    }

    if (rating < 1 || rating > 5) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Rating must be between 1 and 5');
    }

    // Check if restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId }
    });

    if (!restaurant) {
      throw new ApiError(404, 'NOT_FOUND', 'Restaurant not found');
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
