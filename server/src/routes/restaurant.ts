import express from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../index'
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// GET all restaurants with filters and pagination
router.get('/', asyncHandler(async (req, res) => {
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

    const skip = (Number(page) - 1) * Number(limit);
    
    console.log('Backend: Pagination', { page: Number(page), limit: Number(limit), skip });

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
    let orderBy: any = {};
    
    switch (sortBy) {
      case 'name':
        orderBy = { name: sortOrder };
        break;
      case 'rating':
        orderBy = { rating: sortOrder };
        break;
      case 'price':
        // Pentru price, sortăm după priceRange (care e string)
        // Vom face o sortare custom
        orderBy = { priceRange: sortOrder };
        break;
      case 'newest':
        orderBy = { createdAt: sortOrder };
        break;
      case 'mealTickets':
        // Field is `isAcceptedMealTickets` in the schema; the old
        // `acceptsMealTickets` did not exist and made Prisma throw on this sort.
        orderBy = { isAcceptedMealTickets: sortOrder };
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
        take: Number(limit),
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
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
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
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json(restaurant);
}));

// POST new restaurant
router.post('/', asyncHandler(async (req, res) => {
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
      return res.status(400).json({ 
        error: 'Name and address are required' 
      });
    }

    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).json({ 
        error: 'At least one category is required' 
      });
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
      return res.status(400).json({ 
        error: 'Discount percentage must be between 1 and 100 when applying discount' 
      });
    }

    if (!applyDiscount && discountPercentage) {
      return res.status(400).json({ 
        error: 'Cannot set discount percentage when applyDiscount is false' 
      });
    }

    if (existingCategories.length !== categoryIds.length) {
      const foundIds = existingCategories.map(cat => cat.id);
      const missingIds = categoryIds.filter(id => !foundIds.includes(id));
      return res.status(400).json({ 
        error: 'Invalid category IDs',
        missingIds: missingIds
      });
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

router.put('/:id', asyncHandler<{ id: string }>(async (req, res) => {
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
      return res.status(400).json({
        error: 'Discount percentage must be between 1 and 100 when applying discount'
      });
    }

    // Dacă se trimit categoryIds, validează-le și pregătește rescrierea legăturilor.
    // Înainte acest câmp era ignorat, deci editarea categoriilor se pierdea.
    let categoriesUpdate = undefined;
    if (categoryIds !== undefined) {
      if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
        return res.status(400).json({
          error: 'At least one category is required'
        });
      }

      const existingCategories = await prisma.category.findMany({
        where: { id: { in: categoryIds } }
      });

      if (existingCategories.length !== categoryIds.length) {
        const foundIds = existingCategories.map(cat => cat.id);
        const missingIds = categoryIds.filter((catId: string) => !foundIds.includes(catId));
        return res.status(400).json({
          error: 'Invalid category IDs',
          missingIds
        });
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

export default router;
