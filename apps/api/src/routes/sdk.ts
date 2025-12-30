/**
 * SDK Routes
 *
 * Public endpoints for SDK to fetch translations.
 * No authentication required - translations are public.
 */
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

/** SDK translations query schema */
const sdkTranslationsQuerySchema = z.object({
  project: z.string().describe('Project slug'),
  space: z.string().describe('Space slug'),
  environment: z.string().describe('Environment slug'),
  lang: z.string().describe('Language code'),
  namespace: z.string().optional().describe('Optional namespace filter'),
});

/** SDK translations response schema */
const sdkTranslationsResponseSchema = z.object({
  language: z.string(),
  translations: z.record(z.string(), z.string()),
  availableLanguages: z.array(z.string()),
});

/** Error response schema */
const errorResponseSchema = z.object({
  error: z.string(),
});

/** SDK languages query schema */
const sdkLanguagesQuerySchema = z.object({
  project: z.string().describe('Project slug'),
});

/** SDK languages response schema */
const sdkLanguagesResponseSchema = z.object({
  availableLanguages: z.array(z.string()),
});

const sdkRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const prisma: PrismaClient = fastify.prisma;

  /**
   * GET /api/sdk/translations - Fetch translations for SDK
   *
   * Public endpoint - no authentication required.
   * Returns flat key-value translations for a specific language.
   */
  app.get(
    '/sdk/translations',
    {
      schema: {
        description: 'Fetch translations for SDK (public, no auth)',
        tags: ['SDK'],
        querystring: sdkTranslationsQuerySchema,
        response: {
          200: sdkTranslationsResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { project, space, environment, lang, namespace } = request.query;

      // Find project by slug with languages
      const projectRecord = await prisma.project.findFirst({
        where: { slug: project },
        include: {
          languages: true,
        },
      });

      if (!projectRecord) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      // Find environment by slug within the project
      const envRecord = await prisma.environment.findFirst({
        where: {
          projectId: projectRecord.id,
          slug: environment,
        },
        include: {
          branch: {
            include: {
              space: true,
              keys: {
                include: {
                  translations: true,
                },
              },
            },
          },
        },
      });

      if (!envRecord) {
        return reply.status(404).send({ error: 'Environment not found' });
      }

      // Verify the branch belongs to the specified space
      if (envRecord.branch.space.slug !== space) {
        return reply.status(404).send({ error: 'Space not found or mismatch' });
      }

      // Build flat translations object
      const translations: Record<string, string> = {};

      for (const key of envRecord.branch.keys) {
        // Filter by namespace if provided
        if (namespace) {
          if (!key.name.startsWith(`${namespace}:`) && !key.name.startsWith(`${namespace}.`)) {
            continue;
          }
        }

        // Find translation for requested language
        const translation = key.translations.find(
          (t: { language: string; value: string }) => t.language === lang
        );
        if (translation) {
          translations[key.name] = translation.value;
        }
      }

      // Get available languages from project
      const availableLanguages = projectRecord.languages.map(
        (l: { code: string }) => l.code
      );

      // Add cache headers for CDN
      reply.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');

      return {
        language: lang,
        translations,
        availableLanguages,
      };
    }
  );

  /**
   * GET /sdk/languages - Get available languages for a project
   */
  app.get(
    '/sdk/languages',
    {
      schema: {
        description: 'Get available languages for SDK (public, no auth)',
        tags: ['SDK'],
        querystring: sdkLanguagesQuerySchema,
        response: {
          200: sdkLanguagesResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { project } = request.query;

      const projectRecord = await prisma.project.findFirst({
        where: { slug: project },
        include: {
          languages: true,
        },
      });

      if (!projectRecord) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      return {
        availableLanguages: projectRecord.languages.map((l) => l.code),
      };
    }
  );
};

export default sdkRoutes;
