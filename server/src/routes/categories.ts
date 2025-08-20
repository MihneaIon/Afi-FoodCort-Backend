import express from 'express';
// Update the import path to where prisma is actually exported, for example:
import { prisma } from '../index';
// Or, if you intended to export it from index.ts, ensure index.ts has:
// export { prisma } from './prismaClient';

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
router.get('/', async (req, res) => {
  try {
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
    const categoriesWithCount = categories.map((category: { restaurants: string | any[]; }) => ({
      ...category,
      restaurantCount: category.restaurants.length,
      restaurants: undefined // Remove the restaurants array from response
    }));

    res.json(categoriesWithCount);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET single category
router.get('/:id', async (req, res) => {
  try {
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
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, icon } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Type the result properly
    const result = await prisma.$queryRaw<CategoryProcedureResult[]>`
      SELECT * FROM insert_category(${name}, ${description}, ${icon})
    `;

    if (!result || result.length === 0) {
      return res.status(500).json({ error: 'Failed to create category' });
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
  } catch (error) {
    // Error handling...
  }
});

// GET all categories with stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await prisma.$queryRaw`SELECT * FROM get_category_stats()`;
    res.json(stats);
  } catch (error) {
    console.error('Error fetching category stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET suggested categories
router.get('/suggestions', async (req, res) => {
  try {
    const suggestions = await prisma.$queryRaw`SELECT * FROM auto_detect_categories()`;
    res.json(suggestions);
  } catch (error) {
    console.error('Error getting category suggestions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET audit log for categories
router.get('/audit', async (req, res) => {
  try {
    const { limit = 50, category_id } = req.query;
    
    let whereClause = '';
    if (category_id) {
      whereClause = `WHERE category_id = '${category_id}'`;
    }
    
    const auditLog = await prisma.$queryRaw`
      SELECT * FROM category_audit_log 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ${Number(limit)}
    `;
    
    res.json(auditLog);
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
