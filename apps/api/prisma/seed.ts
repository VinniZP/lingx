import 'dotenv/config';
import { PrismaClient, Role, ProjectRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Common languages for seeding
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ru', name: 'Russian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'cs', name: 'Czech' },
  { code: 'tr', name: 'Turkish' },
  { code: 'uk', name: 'Ukrainian' },
];

async function main() {
  console.log('Seeding database...');

  // Seed languages
  console.log('Seeding languages...');
  for (const lang of LANGUAGES) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: {},
      create: lang,
    });
  }
  console.log(`Seeded ${LANGUAGES.length} languages`);

  // Create demo user (password: "password123" - bcrypt hash)
  // In real scenario, hash is generated at runtime
  const demoPasswordHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.S0z1L1Q1Q1Q1Q1';

  console.log('Creating demo user...');
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@localeflow.dev' },
    update: {},
    create: {
      email: 'demo@localeflow.dev',
      password: demoPasswordHash,
      name: 'Demo User',
      role: Role.ADMIN,
    },
  });

  // Create demo project
  console.log('Creating demo project...');
  const demoProject = await prisma.project.upsert({
    where: { slug: 'demo-app' },
    update: {},
    create: {
      name: 'Demo Application',
      slug: 'demo-app',
      description: 'A demo project for testing Localeflow',
      defaultLanguage: 'en',
      languages: {
        create: [
          { code: 'en', name: 'English', isDefault: true },
          { code: 'es', name: 'Spanish', isDefault: false },
          { code: 'fr', name: 'French', isDefault: false },
        ],
      },
      members: {
        create: {
          userId: demoUser.id,
          role: ProjectRole.OWNER,
        },
      },
    },
  });

  // Create demo space with main branch
  console.log('Creating demo space...');
  const demoSpace = await prisma.space.upsert({
    where: {
      projectId_slug: {
        projectId: demoProject.id,
        slug: 'web',
      },
    },
    update: {},
    create: {
      projectId: demoProject.id,
      name: 'Web Application',
      slug: 'web',
      description: 'Frontend web translations',
    },
  });

  // Create main branch
  console.log('Creating main branch...');
  const mainBranch = await prisma.branch.upsert({
    where: {
      spaceId_slug: {
        spaceId: demoSpace.id,
        slug: 'main',
      },
    },
    update: {},
    create: {
      spaceId: demoSpace.id,
      name: 'main',
      slug: 'main',
      isDefault: true,
    },
  });

  // Create demo translation keys and translations
  console.log('Creating demo translations...');
  const demoKeys = [
    {
      name: 'common.welcome',
      description: 'Welcome message on homepage',
      translations: {
        en: 'Welcome to our application!',
        es: 'Bienvenido a nuestra aplicacion!',
        fr: 'Bienvenue dans notre application!',
      },
    },
    {
      name: 'common.hello',
      description: 'Hello greeting with name',
      translations: {
        en: 'Hello, {name}!',
        es: 'Hola, {name}!',
        fr: 'Bonjour, {name}!',
      },
    },
    {
      name: 'cart.items',
      description: 'Shopping cart item count (ICU plural)',
      translations: {
        en: '{count, plural, =0 {No items} one {1 item} other {{count} items}} in cart',
        es: '{count, plural, =0 {Sin articulos} one {1 articulo} other {{count} articulos}} en el carrito',
        fr: '{count, plural, =0 {Aucun article} one {1 article} other {{count} articles}} dans le panier',
      },
    },
    {
      name: 'nav.home',
      description: 'Navigation - Home link',
      translations: {
        en: 'Home',
        es: 'Inicio',
        fr: 'Accueil',
      },
    },
    {
      name: 'nav.about',
      description: 'Navigation - About link',
      translations: {
        en: 'About',
        es: 'Acerca de',
        fr: 'A propos',
      },
    },
  ];

  for (const keyData of demoKeys) {
    const key = await prisma.translationKey.upsert({
      where: {
        branchId_name: {
          branchId: mainBranch.id,
          name: keyData.name,
        },
      },
      update: {},
      create: {
        branchId: mainBranch.id,
        name: keyData.name,
        description: keyData.description,
      },
    });

    for (const [lang, value] of Object.entries(keyData.translations)) {
      await prisma.translation.upsert({
        where: {
          keyId_language: {
            keyId: key.id,
            language: lang,
          },
        },
        update: { value },
        create: {
          keyId: key.id,
          language: lang,
          value,
        },
      });
    }
  }

  // Create development environment
  console.log('Creating development environment...');
  await prisma.environment.upsert({
    where: {
      projectId_slug: {
        projectId: demoProject.id,
        slug: 'development',
      },
    },
    update: {},
    create: {
      projectId: demoProject.id,
      name: 'Development',
      slug: 'development',
      branchId: mainBranch.id,
    },
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
