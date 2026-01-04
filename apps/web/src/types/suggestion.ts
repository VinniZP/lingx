/**
 * Unified Suggestion Types
 *
 * Shared types for translation suggestions (TM, MT, AI).
 */

/**
 * Unified suggestion type that can represent TM, MT, and AI suggestions.
 *
 * Used across the translation workbench for displaying and applying
 * translation suggestions from various sources.
 */
export interface UnifiedSuggestion {
  /** Unique identifier for this suggestion */
  id: string;
  /** Source type: Translation Memory, Machine Translation, or AI */
  type: 'tm' | 'mt' | 'ai';
  /** The suggested translation text */
  text: string;
  /** Confidence score: 0-100 for TM, always 100 for MT/AI */
  confidence: number;
  /** Source key name for TM, provider name for MT/AI */
  source?: string;
  /** MT/AI provider display name */
  provider?: string;
  /** AI model name */
  model?: string;
  /** Whether MT/AI result was cached */
  cached?: boolean;
  /** AI context metadata */
  context?: {
    glossaryTerms: number;
    tmMatches: number;
    relatedKeys: number;
  };
}
