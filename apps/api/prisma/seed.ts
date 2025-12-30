import 'dotenv/config';
import { PrismaClient, Role, ProjectRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { createHash } from 'crypto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// bcrypt cost factor per Design Doc NFRs
const BCRYPT_ROUNDS = 12;

// Demo credentials - printed at end of seed
const DEMO_EMAIL = 'demo@localeflow.dev';
const DEMO_PASSWORD = 'password123';
const DEMO_API_KEY = 'lf_demo_0000000000000000000000000000000000000000000000000000000000000000';

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
  console.log('🌱 Seeding database...\n');

  // Seed languages
  console.log('📚 Seeding languages...');
  for (const lang of LANGUAGES) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: {},
      create: lang,
    });
  }
  console.log(`   ✓ Seeded ${LANGUAGES.length} languages\n`);

  // Create demo user with properly hashed password
  console.log('👤 Creating demo user...');
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  const demoUser = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { password: hashedPassword },
    create: {
      email: DEMO_EMAIL,
      password: hashedPassword,
      name: 'Demo User',
      role: Role.ADMIN,
    },
  });
  console.log(`   ✓ Demo user: ${demoUser.email}\n`);

  // Create API key for demo user (deterministic for testing)
  console.log('🔑 Creating demo API key...');
  const apiKeyHash = createHash('sha256').update(DEMO_API_KEY).digest('hex');
  await prisma.apiKey.upsert({
    where: { keyHash: apiKeyHash },
    update: {},
    create: {
      name: 'Demo API Key',
      keyHash: apiKeyHash,
      keyPrefix: DEMO_API_KEY.substring(0, 11),
      userId: demoUser.id,
    },
  });
  console.log(`   ✓ API key created\n`);

  // Create demo project
  console.log('📁 Creating demo project...');
  let demoProject = await prisma.project.findUnique({
    where: { slug: 'demo-app' },
  });

  if (!demoProject) {
    demoProject = await prisma.project.create({
      data: {
        name: 'Demo Application',
        slug: 'demo-app',
        description: 'A demo project for testing LocaleFlow',
        defaultLanguage: 'en',
      },
    });
  }

  // Ensure project languages exist
  const projectLanguages = [
    { code: 'en', name: 'English', isDefault: true },
    { code: 'es', name: 'Spanish', isDefault: false },
    { code: 'fr', name: 'French', isDefault: false },
    { code: 'de', name: 'German', isDefault: false },
  ];

  for (const lang of projectLanguages) {
    await prisma.projectLanguage.upsert({
      where: {
        projectId_code: {
          projectId: demoProject.id,
          code: lang.code,
        },
      },
      update: {},
      create: {
        projectId: demoProject.id,
        ...lang,
      },
    });
  }

  // Ensure project membership exists
  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: demoProject.id,
        userId: demoUser.id,
      },
    },
    update: {},
    create: {
      projectId: demoProject.id,
      userId: demoUser.id,
      role: ProjectRole.OWNER,
    },
  });
  console.log(`   ✓ Project: ${demoProject.name} (${demoProject.slug})\n`);

  // Create demo space
  console.log('📦 Creating demo space...');
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
  console.log(`   ✓ Space: ${demoSpace.name} (${demoSpace.slug})\n`);

  // Create main branch
  console.log('🌿 Creating main branch...');
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
  console.log(`   ✓ Branch: ${mainBranch.name}\n`);

  // Create demo translation keys and translations
  console.log('🔤 Creating demo translations...');
  const demoKeys = [
    // Common
    {
      name: 'common.welcome',
      description: 'Welcome message on homepage',
      translations: {
        en: 'Welcome to our application!',
        es: '¡Bienvenido a nuestra aplicación!',
        fr: 'Bienvenue dans notre application !',
        de: 'Willkommen in unserer Anwendung!',
      },
    },
    {
      name: 'common.hello',
      description: 'Hello greeting with name (ICU)',
      translations: {
        en: 'Hello, {name}!',
        es: '¡Hola, {name}!',
        fr: 'Bonjour, {name} !',
        de: 'Hallo, {name}!',
      },
    },
    {
      name: 'common.loading',
      description: 'Loading indicator text',
      translations: {
        en: 'Loading...',
        es: 'Cargando...',
        fr: 'Chargement...',
        de: 'Laden...',
      },
    },
    {
      name: 'common.save',
      description: 'Save button text',
      translations: {
        en: 'Save',
        es: 'Guardar',
        fr: 'Enregistrer',
        de: 'Speichern',
      },
    },
    {
      name: 'common.cancel',
      description: 'Cancel button text',
      translations: {
        en: 'Cancel',
        es: 'Cancelar',
        fr: 'Annuler',
        de: 'Abbrechen',
      },
    },
    {
      name: 'common.delete',
      description: 'Delete button text',
      translations: {
        en: 'Delete',
        es: 'Eliminar',
        fr: 'Supprimer',
        de: 'Löschen',
      },
    },
    // Navigation
    {
      name: 'nav.home',
      description: 'Navigation - Home link',
      translations: {
        en: 'Home',
        es: 'Inicio',
        fr: 'Accueil',
        de: 'Startseite',
      },
    },
    {
      name: 'nav.about',
      description: 'Navigation - About link',
      translations: {
        en: 'About',
        es: 'Acerca de',
        fr: 'À propos',
        de: 'Über uns',
      },
    },
    {
      name: 'nav.contact',
      description: 'Navigation - Contact link',
      translations: {
        en: 'Contact',
        es: 'Contacto',
        fr: 'Contact',
        de: 'Kontakt',
      },
    },
    {
      name: 'nav.settings',
      description: 'Navigation - Settings link',
      translations: {
        en: 'Settings',
        es: 'Configuración',
        fr: 'Paramètres',
        de: 'Einstellungen',
      },
    },
    // Auth
    {
      name: 'auth.login',
      description: 'Login button/page title',
      translations: {
        en: 'Log in',
        es: 'Iniciar sesión',
        fr: 'Se connecter',
        de: 'Anmelden',
      },
    },
    {
      name: 'auth.logout',
      description: 'Logout button text',
      translations: {
        en: 'Log out',
        es: 'Cerrar sesión',
        fr: 'Se déconnecter',
        de: 'Abmelden',
      },
    },
    {
      name: 'auth.register',
      description: 'Register button/page title',
      translations: {
        en: 'Sign up',
        es: 'Registrarse',
        fr: "S'inscrire",
        de: 'Registrieren',
      },
    },
    {
      name: 'auth.forgotPassword',
      description: 'Forgot password link text',
      translations: {
        en: 'Forgot password?',
        es: '¿Olvidaste tu contraseña?',
        fr: 'Mot de passe oublié ?',
        de: 'Passwort vergessen?',
      },
    },
    // Forms
    {
      name: 'form.email',
      description: 'Email field label',
      translations: {
        en: 'Email',
        es: 'Correo electrónico',
        fr: 'Adresse e-mail',
        de: 'E-Mail',
      },
    },
    {
      name: 'form.password',
      description: 'Password field label',
      translations: {
        en: 'Password',
        es: 'Contraseña',
        fr: 'Mot de passe',
        de: 'Passwort',
      },
    },
    {
      name: 'form.required',
      description: 'Required field validation message',
      translations: {
        en: 'This field is required',
        es: 'Este campo es obligatorio',
        fr: 'Ce champ est obligatoire',
        de: 'Dieses Feld ist erforderlich',
      },
    },
    // Cart (ICU plurals)
    {
      name: 'cart.items',
      description: 'Shopping cart item count (ICU plural)',
      translations: {
        en: '{count, plural, =0 {No items} one {1 item} other {{count} items}} in cart',
        es: '{count, plural, =0 {Sin artículos} one {1 artículo} other {{count} artículos}} en el carrito',
        fr: '{count, plural, =0 {Aucun article} one {1 article} other {{count} articles}} dans le panier',
        de: '{count, plural, =0 {Keine Artikel} one {1 Artikel} other {{count} Artikel}} im Warenkorb',
      },
    },
    {
      name: 'cart.total',
      description: 'Cart total with currency',
      translations: {
        en: 'Total: {amount, number, ::currency/USD}',
        es: 'Total: {amount, number, ::currency/EUR}',
        fr: 'Total : {amount, number, ::currency/EUR}',
        de: 'Gesamt: {amount, number, ::currency/EUR}',
      },
    },
    // Messages
    {
      name: 'messages.success',
      description: 'Generic success message',
      translations: {
        en: 'Operation completed successfully',
        es: 'Operación completada con éxito',
        fr: 'Opération terminée avec succès',
        de: 'Vorgang erfolgreich abgeschlossen',
      },
    },
    {
      name: 'messages.error',
      description: 'Generic error message',
      translations: {
        en: 'An error occurred. Please try again.',
        es: 'Ocurrió un error. Por favor, inténtalo de nuevo.',
        fr: 'Une erreur est survenue. Veuillez réessayer.',
        de: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
      },
    },
    {
      name: 'messages.notFound',
      description: '404 error message',
      translations: {
        en: 'Page not found',
        es: 'Página no encontrada',
        fr: 'Page non trouvée',
        de: 'Seite nicht gefunden',
      },
    },
    // Date/Time (with ICU)
    {
      name: 'datetime.lastUpdated',
      description: 'Last updated timestamp',
      translations: {
        en: 'Last updated: {date, date, medium}',
        es: 'Última actualización: {date, date, medium}',
        fr: 'Dernière mise à jour : {date, date, medium}',
        de: 'Zuletzt aktualisiert: {date, date, medium}',
      },
    },
  ];

  let keysCreated = 0;
  let translationsCreated = 0;

  for (const keyData of demoKeys) {
    const key = await prisma.translationKey.upsert({
      where: {
        branchId_name: {
          branchId: mainBranch.id,
          name: keyData.name,
        },
      },
      update: { description: keyData.description },
      create: {
        branchId: mainBranch.id,
        name: keyData.name,
        description: keyData.description,
      },
    });
    keysCreated++;

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
      translationsCreated++;
    }
  }
  console.log(`   ✓ Created ${keysCreated} keys with ${translationsCreated} translations\n`);

  // Create environments
  console.log('🌍 Creating environments...');
  const environments = [
    { name: 'Development', slug: 'development' },
    { name: 'Staging', slug: 'staging' },
    { name: 'Production', slug: 'production' },
  ];

  for (const env of environments) {
    await prisma.environment.upsert({
      where: {
        projectId_slug: {
          projectId: demoProject.id,
          slug: env.slug,
        },
      },
      update: {},
      create: {
        projectId: demoProject.id,
        name: env.name,
        slug: env.slug,
        branchId: mainBranch.id,
      },
    });
  }
  console.log(`   ✓ Created ${environments.length} environments\n`);

  // Create a feature branch for demo
  console.log('🌿 Creating feature branch...');
  const featureBranch = await prisma.branch.upsert({
    where: {
      spaceId_slug: {
        spaceId: demoSpace.id,
        slug: 'feature-new-checkout',
      },
    },
    update: {},
    create: {
      spaceId: demoSpace.id,
      name: 'feature-new-checkout',
      slug: 'feature-new-checkout',
      isDefault: false,
      sourceBranchId: mainBranch.id,
    },
  });
  console.log(`   ✓ Branch: ${featureBranch.name}\n`);

  // Summary
  console.log('═'.repeat(50));
  console.log('✅ Seed completed successfully!\n');
  console.log('Demo credentials:');
  console.log(`   Email:    ${DEMO_EMAIL}`);
  console.log(`   Password: ${DEMO_PASSWORD}`);
  console.log(`   API Key:  ${DEMO_API_KEY}`);
  console.log('═'.repeat(50));
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
