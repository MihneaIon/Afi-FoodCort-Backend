import express from 'express';
import { prisma } from '../index';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { validate } from '../middleware/validate';
import {
  CreateReviewBody,
  ReviewsByRestaurantQuery,
  createReviewBodySchema,
  reviewsByRestaurantQuerySchema,
  restaurantIdParamSchema
} from '../validation/schemas';

const router = express.Router();

// POST new review
router.post('/', validate({ body: createReviewBodySchema }), asyncHandler<unknown, unknown, CreateReviewBody>(async (req, res) => {
    const { restaurantId, rating, comment, userName, userEmail } = req.body;

    // restaurantId/userName presence, rating being a number in 1-5, and
    // userEmail's format are all validated by createReviewBodySchema.

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
router.get('/restaurant/:restaurantId', validate({ params: restaurantIdParamSchema, query: reviewsByRestaurantQuerySchema }), asyncHandler<{ restaurantId: string }, unknown, unknown, ReviewsByRestaurantQuery>(async (req, res) => {
    const { restaurantId } = req.params;
    // page/limit are already validated, coerced, and clamped by
    // reviewsByRestaurantQuerySchema.
    const { page: parsedPage, limit: parsedLimit } = req.query;
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
