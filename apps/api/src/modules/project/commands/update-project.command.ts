import type { ICommand } from '../../../shared/cqrs/index.js';
import type { ProjectWithLanguages } from '../project.repository.js';

/**
 * Input for updating a project.
 */
export interface UpdateProjectInput {
  name?: string;
  description?: string;
  languageCodes?: string[];
  defaultLanguage?: string;
}

/**
 * Command to update a project.
 */
export class UpdateProjectCommand implements ICommand<ProjectWithLanguages> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: ProjectWithLanguages;

  constructor(
    /** Project ID or slug */
    public readonly projectIdOrSlug: string,
    /** ID of the user updating the project */
    public readonly userId: string,
    /** Updates to apply */
    public readonly updates: UpdateProjectInput
  ) {}
}
