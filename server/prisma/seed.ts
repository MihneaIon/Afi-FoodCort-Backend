import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Italian',
        slug: 'italian',
        description: 'Romanian-Ialian Pasta, Pizza and more',
        icon: '🍝'
      }
    }),
    prisma.category.create({
      data: {
        name: 'Asian',
        slug: 'asian',
        description: 'Asian fusion with Romanian taste',
        icon: '🍜'
      }
    }),
    prisma.category.create({
      data: {
        name: 'Mexican',
        slug: 'mexican',
        description: 'Spicy and flavorful Mexican food',
        icon: '🌮'
      }
    }),
    prisma.category.create({
      data: {
        name: 'American',
        slug: 'american',
        description: 'Classic American comfort food',
        icon: '🍔'
      }
    }),
    prisma.category.create({
      data: {
        name: 'Mediterranean',
        slug: 'mediterranean',
        description: 'Fresh Mediterranean cuisine',
        icon: '🥗'
      }
    }),
    prisma.category.create({
      data: {
        name: 'Fast Food',
        slug: 'fast-food',
        description: 'Quick and convenient meals',
        icon: '🍟'
      }
    }),
    prisma.category.create({
      data: {
        name: 'Turkeys Food',
        slug: 'turkeysfood',
        description: 'Turkeys Food',
        icon: '🍟'
      }
    }),
    prisma.category.create({
      data: {
        name: 'Leabanese Food',
        slug: 'leabanesefood',
        description: 'Healty Leabanese food',
        icon: '🥗'
      }
    })
  ]);

  console.log('✅ Categories created:', categories.length);

  // Create sample restaurants
  const restaurants = await Promise.all([
    prisma.restaurant.create({
      data: {
        name: 'Mama Mia Pizzeria',
        description: 'Authentic Italian pizza and pasta in the heart of the city',
        address: '123 Main Street, Downtown',
        phone: '+1 (555) 123-4567',
        website: 'https://mamamiapizza.com',
        imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800',
        rating: 4.5,
        priceRange: '$$',
        isOpen: true,
        categories: {
          create: [
            { category: { connect: { id: categories[0].id } } } // Italian
          ]
        }
      }
    }),
    prisma.restaurant.create({
      data: {
        name: 'Dragon Palace',
        description: 'Traditional Chinese cuisine with modern presentation',
        address: '456 Oak Avenue, Chinatown',
        phone: '+1 (555) 987-6543',
        website: 'https://dragonpalace.com',
        imageUrl: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800',
        rating: 4.2,
        priceRange: '$$$',
        isOpen: true,
        categories: {
          create: [
            { category: { connect: { id: categories[1].id } } } // Asian
          ]
        }
      }
    }),
    prisma.restaurant.create({
      data: {
        name: 'El Sombrero',
        description: 'Vibrant Mexican restaurant with live mariachi music',
        address: '789 Sunset Boulevard, West Side',
        phone: '+1 (555) 456-7890',
        website: 'https://elsombrero.com',
        imageUrl: 'https://images.unsplash.com/photo-1565299585323-38174c9a3f5e?w=800',
        rating: 4.7,
        priceRange: '$$',
        isOpen: true,
        categories: {
          create: [
            { category: { connect: { id: categories[2].id } } } // Mexican
          ]
        }
      }
    })
  ]);

  console.log('✅ Restaurants created:', restaurants.length);

  // Create sample reviews
  const reviews = await Promise.all([
    prisma.review.create({
      data: {
        rating: 5,
        comment: 'Amazing pizza! The crust was perfect and the sauce was delicious.',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        restaurantId: restaurants[0].id
      }
    }),
    prisma.review.create({
      data: {
        rating: 4,
        comment: 'Great atmosphere and friendly service. Will definitely come back!',
        userName: 'Jane Smith',
        userEmail: 'jane@example.com',
        restaurantId: restaurants[0].id
      }
    }),
    prisma.review.create({
      data: {
        rating: 5,
        comment: 'Best Chinese food in the city! The dumplings were incredible.',
        userName: 'Mike Johnson',
        userEmail: 'mike@example.com',
        restaurantId: restaurants[1].id
      }
    })
  ]);

  console.log('✅ Reviews created:', reviews.length);
  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    // process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
