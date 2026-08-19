import express from 'express';import { Prisma } from '@prisma/client';
import { prisma } from '../index';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { validate } from '../middleware/validate';
import {
  CategoryAuditQuery,
  CreateCategoryBody,
  categoryAuditQuerySchema,
  createCategoryBodySchema,
  idParamSchema
} from '../validation/schemas';

const router = express.Router();

interface CategoryProcedureResult {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  created_at: Date;
}

// GET all categories
router.get('/', asyncHandler(async (req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        restaurants: {
          select: {
            restaurantId: true
          }
        }
      }
    });

    // Add restaurant count to each category
     const categoriesWithCount = categories.map((category: { restaurants: unknown[] }) => ({
     ...category,
      restaurantCount: category.restaurants.length,
      restaurants: undefined // Remove the restaurants array from response
    }));

    res.json(categoriesWithCount);
}));

// NOTE: Static routes (/stats, /suggestions, /audit) MUST be declared before the
// dynamic "/:id" route, otherwise Express matches them as an id and they become dead.

// GET all categories with stats
router.get('/stats', asyncHandler(async (req, res) => {
    const stats = await prisma.$queryRaw`SELECT * FROM get_category_stats()`;
    res.json(stats);
}));

// GET suggested categories
router.get('/suggestions', asyncHandler(async (req, res) => {
    const suggestions = await prisma.$queryRaw`SELECT * FROM auto_detect_categories()`;
    res.json(suggestions);
}));

// GET audit log for categories
router.get('/audit', validate({ query: categoryAuditQuerySchema }), asyncHandler<unknown, unknown, unknown, CategoryAuditQuery>(async (req, res) => {
    const { limit: parsedLimit, category_id } = req.query;

    // Parameterized query: category_id is bound as a value, never concatenated,
    // so this is no longer vulnerable to SQL injection.
    const auditLog = await prisma.$queryRaw`
      SELECT * FROM category_audit_log
      ${category_id ? Prisma.sql`WHERE category_id = ${category_id}` : Prisma.empty}
      ORDER BY created_at DESC
      LIMIT ${parsedLimit}
    `;

    res.json(auditLog);
}));

// GET single category (dynamic route — declared AFTER the static ones above)
router.get('/:id', validate({ params: idParamSchema }), asyncHandler<{ id: string }>(async (req, res) => {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: {
        restaurants: {
          include: {
            restaurant: {
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
              }
            }
          }
        }
      }
    });

    if (!category) {
      throw new ApiError(404, 'NOT_FOUND', 'Category not found');
    }

    res.json(category);
}));

// POST new category
router.post('/', validate({ body: createCategoryBodySchema }), asyncHandler<unknown, unknown, CreateCategoryBody>(async (req, res) => {
    const { name, description, icon } = req.body;

    // name presence is validated by createCategoryBodySchema.

    // Type the result properly
    const result = await prisma.$queryRaw<CategoryProcedureResult[]>`
      SELECT * FROM insert_category(${name}, ${description}, ${icon})
    `;

    if (!result || result.length === 0) {
      throw new ApiError(500, 'INTERNAL_ERROR', 'Failed to create category');
    }

    const newCategory: CategoryProcedureResult = result[0];

    res.status(201).json({
      id: newCategory.id,
      name: newCategory.name,
      slug: newCategory.slug,
      description: newCategory.description,
      icon: newCategory.icon,
      createdAt: newCategory.created_at
    });
}));

export default router;
