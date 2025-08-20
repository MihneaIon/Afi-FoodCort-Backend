import express from 'express';
import { prisma } from '../index'

const router = express.Router();

// GET all restaurants with filters
router.get('/', async (req, res) => {
  try {
    const {
      category,
      priceRange,
      rating,
      search,
      page = 1,
      limit = 12
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      isOpen: true,
    };

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
        orderBy: { rating: 'desc' }
      }),
      prisma.restaurant.count({ where })
    ]);

    res.json({
      restaurants,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET single restaurant
router.get('/:id', async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST new restaurant
router.post('/', async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Error creating restaurant:', error);
    if (typeof error === 'object' && error !== null) {
      console.error('Error details:', {
        code: (error as any).code,
        meta: (error as any).meta,
        message: (error as any).message
      });
      res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? (error as any).message : undefined
      });
    } else {
      res.status(500).json({ 
        error: 'Internal server error'
      });
    }
  }
});

router.put('/:id', async (req, res) => {
  try {
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
      categoryIds
    } = req.body;

    // Validare pentru discount
    if (applyDiscount && (!discountPercentage || discountPercentage <= 0 || discountPercentage > 100)) {
      return res.status(400).json({ 
        error: 'Discount percentage must be between 1 and 100 when applying discount' 
      });
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
  } catch (error) {
    console.error('Error updating restaurant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
