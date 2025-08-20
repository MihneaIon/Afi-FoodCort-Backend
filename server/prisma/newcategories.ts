import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {

  const categories = await Promise.all([
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
