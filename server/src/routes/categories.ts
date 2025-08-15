import express from 'express';
// Update the import path to where prisma is actually exported, for example:
import { prisma } from '../index';
import { PrismaClient } from '@prisma/client';
// Or, if you intended to export it from index.ts, ensure index.ts has:
// export { prisma } from './prismaClient';

const router = express.Router();

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

// POST new category
router.post('/', async (req, res) => {
  try {
    const { name, description, icon } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Create slug from name
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Check if category with this slug already exists
    const existingCategory = await prisma.category.findUnique({
      where: { slug }
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        icon
      }
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
