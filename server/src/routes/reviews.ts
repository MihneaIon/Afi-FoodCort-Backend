import express from 'express';
import { prisma } from '../index';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { CreateReviewBody, ReviewsByRestaurantQuery } from '../types/dto';

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
router.get('/restaurant/:restaurantId', asyncHandler<{ restaurantId: string }, unknown, unknown, ReviewsByRestaurantQuery>(async (req, res) => {
    const { restaurantId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Clamp page/limit the same way the restaurant list endpoint does, so a
    // client can't request an unbounded page size (e.g. limit=999999).
    const parsedPage = Math.max(Number(page) || 1, 1);
    const parsedLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const skip = (parsedPage - 1) * parsedLimit;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { restaurantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parsedLimit
      }),
      prisma.review.count({ where: { restaurantId } })
    ]);

    res.json({
      reviews,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit)
      }
    });
}));

export default router;
