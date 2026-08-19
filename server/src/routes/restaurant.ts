import express from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../index'
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { validate } from '../middleware/validate';
import {
  RestaurantListQuery,
  CreateRestaurantBody,
  UpdateRestaurantBody,
  restaurantListQuerySchema,
  createRestaurantBodySchema,
  updateRestaurantBodySchema,
  idParamSchema
} from '../validation/schemas';

const router = express.Router();

// GET all restaurants with filters and pagination
router.get('/', validate({ query: restaurantListQuerySchema }), asyncHandler<unknown, unknown, unknown, RestaurantListQuery>(async (req, res) => {
    const {
      category,
      priceRange,
      rating,
      discounted,
      applyMealTickets,
      search,
      page,
      limit,
      sortBy,
      sortOrder
    } = req.query;

    console.log('Backend: Received query params', req.query);

    // page/limit are already validated, coerced, and clamped by
    // restaurantListQuerySchema.
    const parsedPage = page;
    const parsedLimit = limit;
    const skip = (parsedPage - 1) * parsedLimit;

    console.log('Backend: Pagination', { page: parsedPage, limit: parsedLimit, skip });

    const where: Prisma.RestaurantWhereInput = {};

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Category filter
    if (category) {
      where.categories = {
        some: {
          category: {
            slug: category as string
          }
        }
      };
    }

    // Price range filter
    if (priceRange) {
      where.priceRange = priceRange as string;
    }

    // Rating filter
    if (rating !== undefined) {
      where.rating = {
        gte: rating
      };
    }

    // Discount filter
    if (discounted === 'true') {
      where.applyDiscount = true;
    }

    // Meal tickets filter
    if (applyMealTickets === 'true') {
      where.isAcceptedMealTickets = true;
    }

    // Sortare - configurează orderBy
    const order: Prisma.SortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
    let orderBy: Prisma.RestaurantOrderByWithRelationInput = {};

    switch (sortBy) {
      case 'name':
        orderBy = { name: order };
        break;
      case 'rating':
        orderBy = { rating: order };
        break;
      case 'price':
        // Pentru price, sortăm după priceRange (care e string)
        // Vom face o sortare custom
        orderBy = { priceRange: order };
        break;
      case 'newest':
        orderBy = { createdAt: order };
        break;
      case 'mealTickets':
        // Field is `isAcceptedMealTickets` in the schema; the old
        // `acceptsMealTickets` did not exist and made Prisma throw on this sort.
        orderBy = { isAcceptedMealTickets: order };
        break;
      default:
        orderBy = { rating: 'desc' };
    }

    console.log('Backend: Where clause', JSON.stringify(where, null, 2));
    console.log('Backend: Order by', orderBy);

    const [restaurants, total] = await Promise.all([
      prisma.restaurant.findMany({
        where,
        include: {
          categories: {
            include: {
              category: true
            }
          },
          reviews: {
            take: 3,
            orderBy: { createdAt: 'desc' }
          }
        },
        skip,
        take: parsedLimit,
        orderBy
      }),
      prisma.restaurant.count({ where })
    ]);

    // NOTE: price sorting is now done in the DB (see the switch above:
    // orderBy = { priceRange: sortOrder }). The '$', '$$', '$$$', '$$$$' values
    // sort correctly lexicographically ('$' < '$$' < '$$$' < '$$$$'), so no JS
    // re-sort is needed. The old JS sort only reordered the current page, which
    // produced a wrong global order once pagination kicked in.
    const response = {
      restaurants,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit)
      }
    };

    res.json(response);
}));

// GET single restaurant
router.get('/:id', validate({ params: idParamSchema }), asyncHandler<{ id: string }>(async (req, res) => {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: req.params.id },
      include: {
        categories: {
          include: {
            category: true
          }
        },
        reviews: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!restaurant) {
      throw new ApiError(404, 'NOT_FOUND', 'Restaurant not found');
    }

    res.json(restaurant);
}));

// POST new restaurant
router.post('/', validate({ body: createRestaurantBodySchema }), asyncHandler<unknown, unknown, CreateRestaurantBody>(async (req, res) => {
    const {
      name,
      description,
      address,
      phone,
      website,
      imageUrl,
      priceRange,
      applyDiscount,
      discountPercentage,
      isAcceptedMealTickets,
      categoryIds
    } = req.body;

    // Field presence/format/cross-field checks (name/address required,
    // priceRange enum, categoryIds non-empty, discount range) are handled by
    // createRestaurantBodySchema. What's left is the referential check below,
    // which needs a DB round-trip and so can't live in the schema.
    const existingCategories = await prisma.category.findMany({
      where: {
        id: {
          in: categoryIds
        }
      }
    });

    if (existingCategories.length !== categoryIds.length) {
      const foundIds = existingCategories.map(cat => cat.id);
      const missingIds = categoryIds.filter(id => !foundIds.includes(id));
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid category IDs', { missingIds });
    }


   // Creează restaurantul cu categoriile
    const restaurant = await prisma.restaurant.create({
      data: {
        name,
        description,
        address,
        phone,
        website,
        imageUrl,
        priceRange,
        applyDiscount,              // Nou
        discountPercentage: applyDiscount ? discountPercentage : null, // Nou
        isAcceptedMealTickets,
        categories: {
          create: categoryIds.map((categoryId: string) => ({
            categoryId: categoryId
          }))
        }
      },
      include: {
        categories: {
          include: {
            category: true
          }
        },
        reviews: true
      }
    });

    res.status(201).json(restaurant);
}));

router.put('/:id', validate({ params: idParamSchema, body: updateRestaurantBodySchema }), asyncHandler<{ id: string }, unknown, UpdateRestaurantBody>(async (req, res) => {
    const { id } = req.params;
    const {
      name,
      description,
      address,
      phone,
      website,
      imageUrl,
      priceRange,
      isOpen,
      applyDiscount,              // Nou
      discountPercentage,         // Nou
      isAcceptedMealTickets,
      categoryIds
    } = req.body;

    // priceRange enum, the discount range, and categoryIds non-emptiness are
    // validated by updateRestaurantBodySchema. Dacă se trimit categoryIds,
    // verifică-le existența și pregătește rescrierea legăturilor — înainte
    // acest câmp era ignorat, deci editarea categoriilor se pierdea.
    let categoriesUpdate = undefined;
    if (categoryIds !== undefined) {
      const existingCategories = await prisma.category.findMany({
        where: { id: { in: categoryIds } }
      });

      if (existingCategories.length !== categoryIds.length) {
        const foundIds = existingCategories.map(cat => cat.id);
        const missingIds = categoryIds.filter((catId: string) => !foundIds.includes(catId));
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid category IDs', { missingIds });
      }

      // Șterge legăturile vechi și creează-le pe cele noi (înlocuire completă).
      categoriesUpdate = {
        deleteMany: {},
        create: categoryIds.map((categoryId: string) => ({ categoryId }))
      };
    }

    // Update restaurant
    const restaurant = await prisma.restaurant.update({
      where: { id },
      data: {
        name,
        description,
        address,
        phone,
        website,
        imageUrl,
        priceRange,
        isOpen,
        applyDiscount,              // Nou
        discountPercentage: applyDiscount ? discountPercentage : null, // Nou
        isAcceptedMealTickets,
        ...(categoriesUpdate ? { categories: categoriesUpdate } : {})
      },
      include: {
        categories: {
          include: {
            category: true
          }
        },
        reviews: true
      }
    });

    res.json(restaurant);
}));

// DELETE restaurant. Categories/reviews are removed via the schema's
// onDelete: Cascade, so no manual cleanup is needed here. A missing id
// throws Prisma's P2025, which errorHandler already maps to 404.
router.delete('/:id', validate({ params: idParamSchema }), asyncHandler<{ id: string }>(async (req, res) => {
    await prisma.restaurant.delete({ where: { id: req.params.id } });

    res.status(204).send();
}));

export default router;
