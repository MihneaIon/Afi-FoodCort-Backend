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
        icon: '🦃'
      }
    }),
    prisma.category.create({
      data: {
        name: 'Leabanese Food',
        slug: 'leabanesefood',
        description: 'Healty Leabanese food',
        icon: '🥙'
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
    })
  ]);

  console.log('✅ Categories created:', categories.length);

  // Create sample restaurants
  const restaurants = await Promise.all([
    prisma.restaurant.create({
      data: {
        name: 'MiPiace',
        description: 'Restaurantul folosește ingrediente proaspete de înaltă calitate, achiziționate de la furnizori de încredere în fiecare dimineață, pentru a prepara paste delicioase și sățioase. Meniul este actualizat de mai multe ori pe lună, însă Mi Piace rămâne fidel rețetelor tradiționale italiene și tehnologiilor de gătit. Produsele servite sunt naturale, cu paste preparate chiar la restaurant din făină de înaltă calitate, ouă, lapte, unt și multă dragoste. Culorile pastelor sunt obținute într-un mod natural, oferind un aspect atrăgător și autentic. Pentru cei cu preferințe dietetice speciale, Mi Piace oferă și opțiuni vegetariane.',
        address: 'Bulevardul 15 Noiembrie 78 Etajul 1',
        phone: '',
        website: 'https://afibrasov.ro/retailer/mipiace/',
        imageUrl: 'https://afibrasov.ro/wp-content/uploads/2024/10/MiPiace-Afi-Mall-Brasov-1536x864.png',
        rating: 4.5,
        priceRange: '$$',
        isOpen: true,
        discountPercentage: 20,
        applyDiscount: true,
        categories: {
          create: [
            { category: { connect: { id: categories[0].id } } } // Italian
          ]
        }
      }
    }),
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
