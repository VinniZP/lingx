import type { QualityIssue } from '@lingx/shared';
import type { Translation } from '@prisma/client';
import type { ICommand } from '../../../shared/cqrs/index.js';

export interface SetTranslationWithQualityResult {
  translation: Translation;
  qualityIssues: QualityIssue[];
}

/**
 * Command to set a translation with quality check feedback.
 */
export class SetTranslationWithQualityCommand implements ICommand<SetTranslationWithQualityResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: SetTranslationWithQualityResult;

  constructor(
    public readonly keyId: string,
    public readonly language: string,
    public readonly value: string,
    public readonly userId: string
  ) {}
}
