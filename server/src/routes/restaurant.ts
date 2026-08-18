import express from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../index'
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import {
  RestaurantListQuery,
  CreateRestaurantBody,
  UpdateRestaurantBody,
  PRICE_RANGES
} from '../types/dto';

const router = express.Router();

// GET all restaurants with filters and pagination
router.get('/', asyncHandler<unknown, unknown, unknown, RestaurantListQuery>(async (req, res) => {
    const {
      category, 
      priceRange, 
      rating,
      discounted,
      applyMealTickets,
      search,
      page = 1,
      limit = 12,
      sortBy = 'rating',      
      sortOrder = 'desc'      // sau asc
    } = req.query;

    console.log('Backend: Received query params', req.query);

    // Clamp page/limit so a client can't request an unbounded page size
    // (e.g. limit=999999) or a negative/zero page.
    const parsedPage = Math.max(Number(page) || 1, 1);
    const parsedLimit = Math.min(Math.max(Number(limit) || 12, 1), 100);
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
    if (rating) {
      where.rating = {
        gte: Number(rating)
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
router.get('/:id', asyncHandler<{ id: string }>(async (req, res) => {
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
router.post('/', asyncHandler<unknown, unknown, CreateRestaurantBody>(async (req, res) => {
    console.log('req.body'+req.body);
    const {
      name,
      description,
      address,
      phone,
      website,
      imageUrl,
      priceRange,
      applyDiscount = false,      // Nou cu valoare default
      discountPercentage,         // Nou
      isAcceptedMealTickets,
      categoryIds
    } = req.body;

    console.log('Request body:', req.body);
    console.log('Category IDs:', categoryIds);

     // Validare
    if (!name || !address) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Name and address are required');
    }

    if (!PRICE_RANGES.includes(priceRange)) {
      throw new ApiError(400, 'VALIDATION_ERROR', `priceRange must be one of ${PRICE_RANGES.join(', ')}`);
    }

    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'At least one category is required');
    }

     // Verifică că toate categoriile există
    const existingCategories = await prisma.category.findMany({
      where: {
        id: {
          in: categoryIds
        }
      }
    });

    // Validare pentru discount
    if (applyDiscount && (!discountPercentage || discountPercentage <= 0 || discountPercentage > 100)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Discount percentage must be between 1 and 100 when applying discount');
    }

    if (!applyDiscount && discountPercentage) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Cannot set discount percentage when applyDiscount is false');
    }

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

router.put('/:id', asyncHandler<{ id: string }, unknown, UpdateRestaurantBody>(async (req, res) => {
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

    // Validare pentru discount
    if (applyDiscount && (!discountPercentage || discountPercentage <= 0 || discountPercentage > 100)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Discount percentage must be between 1 and 100 when applying discount');
    }

    if (priceRange !== undefined && !PRICE_RANGES.includes(priceRange)) {
      throw new ApiError(400, 'VALIDATION_ERROR', `priceRange must be one of ${PRICE_RANGES.join(', ')}`);
    }

    // Dacă se trimit categoryIds, validează-le și pregătește rescrierea legăturilor.
    // Înainte acest câmp era ignorat, deci editarea categoriilor se pierdea.
    let categoriesUpdate = undefined;
    if (categoryIds !== undefined) {
      if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'At least one category is required');
      }

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
router.delete('/:id', asyncHandler<{ id: string }>(async (req, res) => {
    await prisma.restaurant.delete({ where: { id: req.params.id } });

    res.status(204).send();
}));

export default router;
