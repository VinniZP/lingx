/**
 * SDK Routes
 *
 * Public endpoints for SDK to fetch translations.
 * No authentication required - translations are public.
 */
import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';

interface SdkTranslationsQuery {
  project: string;
  space: string;
  environment: string;
  lang: string;
  namespace?: string;
}

interface SdkTranslationsResponse {
  language: string;
  translations: Record<string, string>;
  availableLanguages: string[];
}

const sdkRoutes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  /**
   * GET /api/sdk/translations - Fetch translations for SDK
   *
   * Public endpoint - no authentication required.
   * Returns flat key-value translations for a specific language.
   */
  fastify.get<{ Querystring: SdkTranslationsQuery }>(
    '/sdk/translations',
    {
      schema: {
        description: 'Fetch translations for SDK (public, no auth)',
        tags: ['SDK'],
        querystring: {
          type: 'object',
          required: ['project', 'space', 'environment', 'lang'],
          properties: {
            project: { type: 'string', description: 'Project slug' },
            space: { type: 'string', description: 'Space slug' },
            environment: { type: 'string', description: 'Environment slug' },
            lang: { type: 'string', description: 'Language code' },
            namespace: { type: 'string', description: 'Optional namespace filter' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              language: { type: 'string' },
              translations: {
                type: 'object',
                additionalProperties: { type: 'string' },
              },
              availableLanguages: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
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

      const response: SdkTranslationsResponse = {
        language: lang,
        translations,
        availableLanguages,
      };

      // Add cache headers for CDN
      reply.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');

      return response;
    }
  );

  /**
   * GET /sdk/languages - Get available languages for a project
   */
  fastify.get<{ Querystring: { project: string } }>(
    '/sdk/languages',
    {
      schema: {
        description: 'Get available languages for SDK (public, no auth)',
        tags: ['SDK'],
        querystring: {
          type: 'object',
          required: ['project'],
          properties: {
            project: { type: 'string', description: 'Project slug' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              availableLanguages: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
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
