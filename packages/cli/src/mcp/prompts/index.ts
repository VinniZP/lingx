import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Register MCP prompts for common Lingx workflows.
 */
export function registerPrompts(server: McpServer): void {
  // lingx_resolve_conflicts - Guide for resolving translation conflicts
  server.prompt(
    'lingx_resolve_conflicts',
    'Guide for resolving translation conflicts after sync or push',
    {
      conflicts: z.string().describe('JSON array of conflicts from sync/push'),
    },
    async (args) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are helping resolve translation conflicts in a Lingx project.

The following conflicts were detected during sync/push:

${args.conflicts}

For each conflict:
1. Compare the local and remote values carefully
2. Use the lingx_analyze_conflict tool to get detailed analysis
3. Consider which value is more correct or recent
4. Recommend a resolution (use_local, use_remote, or a merged value)

After analyzing all conflicts:
- Summarize your recommendations
- Explain the reasoning for each
- If using lingx_sync or lingx_push, show how to apply the resolutions

Be concise but thorough in your analysis.`,
            },
          },
        ],
      };
    }
  );

  // lingx_fix_quality_issues - Guide for fixing quality issues
  server.prompt(
    'lingx_fix_quality_issues',
    'Guide for fixing quality issues from check command',
    {
      issues: z.string().describe('JSON array of quality issues'),
    },
    async (args) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are helping fix translation quality issues in a Lingx project.

The following quality issues were detected:

${args.issues}

Common issues and their fixes:
- Missing placeholders: Ensure all {variables} from source are present in translation
- Extra placeholders: Verify if they are intentional or should be removed
- Whitespace issues: Remove leading/trailing spaces unless intentional
- Punctuation mismatch: Match the source's ending punctuation
- Length anomalies: Verify translation is complete and appropriately sized

For each issue:
1. Use lingx_check_quality_issues for detailed analysis
2. Propose a specific fix
3. Explain why the fix is appropriate

Provide the fixed translations that can be applied using lingx_key_add or direct file edits.`,
            },
          },
        ],
      };
    }
  );

  // lingx_add_translation - Guide for adding new translations
  server.prompt(
    'lingx_add_translation',
    'Guide for adding new translations with proper naming',
    {
      description: z.string().describe('Description of what needs to be translated'),
      english_text: z.string().optional().describe('The English text to translate'),
    },
    async (args) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are helping add new translations to a Lingx project.

Feature/UI element description: ${args.description}
${args.english_text ? `English text: "${args.english_text}"` : ''}

Steps to follow:
1. Use lingx_suggest_key_name to get key name suggestions based on the text and context
2. Use lingx_search_translations to check for existing similar translations (avoid duplicates)
3. Use lingx_search_keys to verify the suggested key doesn't conflict with existing keys
4. Use lingx_key_add to add the new key with values for each language
5. Use lingx_types to regenerate TypeScript types

Guidelines:
- Follow the project's existing naming conventions
- Use namespaces appropriately (e.g., "buttons.", "errors.", "forms.")
- Consider context when naming (e.g., "auth.login.button" vs just "login")
- Provide translations for all configured languages if possible

After adding the translation:
- Verify with lingx_search_keys that the key was added correctly
- Remind about running lingx_types if types are enabled`,
            },
          },
        ],
      };
    }
  );

  // lingx_extract_and_organize - Guide for extracting and organizing keys
  server.prompt(
    'lingx_extract_and_organize',
    'Guide for extracting keys from code and organizing them',
    {},
    async () => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are helping extract and organize translation keys in a Lingx project.

Steps to follow:

1. Run lingx_extract to find all translation keys in the source code
   - Review the list of extracted keys
   - Identify any new keys not yet in translation files

2. Run lingx_check to identify issues:
   - Missing keys (in code but not in translations)
   - Unused keys (in translations but not in code)
   - ICU syntax errors
   - Quality issues

3. For new/missing keys:
   - Use lingx_suggest_key_name to ensure good naming
   - Use lingx_key_add to add them with appropriate values

4. For unused keys:
   - Verify they are truly unused (not dynamically referenced)
   - Use lingx_key_remove to clean up if confirmed unused

5. For keys with issues:
   - Use lingx_validate_icu for ICU syntax problems
   - Use lingx_check_quality_issues for quality problems
   - Apply fixes as needed

6. Use lingx_find_similar_keys to identify potential duplicates
   - Consider consolidating similar keys
   - Use lingx_key_move to reorganize if needed

7. Finally, run lingx_types to regenerate TypeScript types

Report:
- Summary of keys extracted
- Keys added/removed/fixed
- Any remaining issues requiring attention`,
            },
          },
        ],
      };
    }
  );

  // lingx_setup_new_language - Guide for adding a new language
  server.prompt(
    'lingx_setup_new_language',
    'Guide for adding support for a new language',
    {
      language_code: z.string().describe('The language code to add (e.g., "fr", "de", "ja")'),
      language_name: z.string().optional().describe('The language name (e.g., "French", "German")'),
    },
    async (args) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are helping add support for a new language in a Lingx project.

Language to add: ${args.language_code}${args.language_name ? ` (${args.language_name})` : ''}

Steps to follow:

1. Use lingx_status to verify the current configuration
   - Note the translations path and format

2. Use lingx_pull to get the current state from the server
   - This ensures we have all keys

3. Check the project's language configuration:
   - If using the Lingx platform, the new language should be added there first
   - Then run lingx_pull --lang ${args.language_code} to create the file

4. For a manual setup without the platform:
   - Copy an existing translation file
   - Create ${args.language_code}.json (or .yaml) in the translations directory
   - Add placeholder or empty values for all keys

5. Use lingx_check to verify:
   - The new language file is recognized
   - All keys are present (even if empty)

6. Consider ICU MessageFormat:
   - For languages with complex plural rules, verify pluralization
   - Use lingx_validate_icu to check syntax

Tips for ${args.language_code}:
${getLanguageTips(args.language_code)}

After setup:
- Push changes with lingx_push if using the platform
- Update your app's language configuration to include the new language`,
            },
          },
        ],
      };
    }
  );
}

/**
 * Get language-specific tips.
 */
function getLanguageTips(languageCode: string): string {
  const tips: Record<string, string> = {
    ar: '- Arabic is RTL (right-to-left)\n- Consider text expansion (~30%)\n- Pluralization: 6 forms (zero, one, two, few, many, other)',
    zh: '- No spaces between words\n- Consider character limits differently\n- No pluralization needed',
    ja: '- No spaces between words\n- Honorific levels may require different translations\n- No pluralization needed',
    ko: '- Consider honorific levels\n- No pluralization needed',
    de: '- Compound words can be very long\n- Consider text expansion (~30%)\n- 4 grammatical cases',
    fr: '- Consider text expansion (~15-20%)\n- Gendered nouns require attention\n- Pluralization: 2 forms (one, other)',
    es: '- Consider text expansion (~15-20%)\n- Gendered adjectives\n- Pluralization: 2 forms (one, other)',
    ru: '- Cyrillic script\n- 6 grammatical cases\n- Pluralization: 3 forms (one, few, many)',
    pl: '- Complex pluralization: 3 forms (one, few, many)',
    he: '- Hebrew is RTL (right-to-left)\n- Consider text expansion',
  };

  return tips[languageCode] ?? '- Review language-specific plural rules\n- Check for text expansion/contraction\n- Verify character encoding support';
}
