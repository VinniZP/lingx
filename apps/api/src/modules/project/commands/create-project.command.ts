import type { ICommand } from '../../../shared/cqrs/index.js';
import type { ProjectWithLanguages } from '../project.repository.js';

/**
 * Command to create a new project.
 */
export class CreateProjectCommand implements ICommand<ProjectWithLanguages> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: ProjectWithLanguages;

  constructor(
    /** Project name */
    public readonly name: string,
    /** Project slug (URL-friendly identifier) */
    public readonly slug: string,
    /** Optional project description */
    public readonly description: string | undefined | null,
    /** Language codes for the project */
    public readonly languageCodes: string[],
    /** Default language code */
    public readonly defaultLanguage: string,
    /** ID of the user creating the project */
    public readonly userId: string
  ) {}
}
