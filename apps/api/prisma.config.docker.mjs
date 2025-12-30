// Simplified Prisma config for Docker production environment
// Avoids module resolution issues with pnpm's symlinked node_modules

export default {
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
};