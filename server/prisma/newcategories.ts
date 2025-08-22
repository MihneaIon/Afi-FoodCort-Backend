import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {

  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Greek',
        slug: 'greek',
        description: 'Fresh and healthy Greek cuisine',
        icon: '🌊'
      }
    }),
    prisma.category.create({
      data: {
        name: 'Drinks',
        slug: 'adult drinks',
        description: 'Alcoholic and non-alcoholic beverages',
        icon: '🍸'
      }
    }),
    prisma.category.create({
      data: {
        name: 'Cofee',
        slug: 'coffee',
        description: 'Smell and taste of fresh coffee',
        icon: '☕'
      }
    }),
    prisma.category.create({
      data: {
        name: 'Salat',
        slug: 'salat',
        description: 'Healthy and fresh salads',
        icon: '🥗'
      }
    }),
    prisma.category.create({
      data: {
        name: 'Desert',
        slug: 'desert',
        description: 'Healty and sweetr desert',
        icon: '🍰'
      }
    }),
    prisma.category.create({
      data: {
        name: 'Pizza',
        slug: 'pizza',
        description: 'Pizza with fresh ingredients',
        icon: '🍕'
      }
    }),
    prisma.category.create({
      data: {
        name: 'Romanian',
        slug: 'romanian',
        description: 'Traditional Romanian cuisine with a modern twist',
        icon: '🧛'
      }
    }),
    prisma.category.create({
      data: {
        name: 'Japanese',
        slug: 'japanise',
        description: 'Japanese cuisine with a fusion of flavors',
        icon: '🍜'
      }
    }),
    prisma.category.create({
      data: {
        name: 'Hungarian',
        slug: 'hungarian',
        description: 'Hungarian cuisine with a touch of tradition',
        icon: '🥘'
      }
    })
  ]);

  console.log('✅ Categories created:', categories.length);

}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    // process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
