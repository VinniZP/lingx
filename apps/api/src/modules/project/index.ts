/**
 * Project Module
 *
 * CQRS-lite module for project operations.
 * Provides commands for create/update/delete and queries for retrieval.
 */

import type { AwilixContainer } from 'awilix';
import { asClass } from 'awilix';
import type { Cradle } from '../../shared/container/index.js';
import {
  defineCommandHandler,
  defineEventHandler,
  defineQueryHandler,
  registerCommandHandlers,
  registerEventHandlers,
  registerQueryHandlers,
} from '../../shared/cqrs/index.js';

// Repository
import { ProjectRepository } from './project.repository.js';

// Command handlers
import { CreateProjectHandler } from './commands/create-project.handler.js';
import { DeleteProjectHandler } from './commands/delete-project.handler.js';
import { UpdateProjectHandler } from './commands/update-project.handler.js';

// Query handlers
import { GetProjectActivityHandler } from './queries/get-project-activity.handler.js';
import { GetProjectStatsHandler } from './queries/get-project-stats.handler.js';
import { GetProjectTreeHandler } from './queries/get-project-tree.handler.js';
import { GetProjectHandler } from './queries/get-project.handler.js';
import { ListProjectsHandler } from './queries/list-projects.handler.js';

// Commands
import { CreateProjectCommand } from './commands/create-project.command.js';
import { DeleteProjectCommand } from './commands/delete-project.command.js';
import { UpdateProjectCommand } from './commands/update-project.command.js';

// Queries
import { GetProjectActivityQuery } from './queries/get-project-activity.query.js';
import { GetProjectStatsQuery } from './queries/get-project-stats.query.js';
import { GetProjectTreeQuery } from './queries/get-project-tree.query.js';
import { GetProjectQuery } from './queries/get-project.query.js';
import { ListProjectsQuery } from './queries/list-projects.query.js';

// Events
import { ProjectCreatedEvent } from './events/project-created.event.js';
import { ProjectDeletedEvent } from './events/project-deleted.event.js';
import { ProjectUpdatedEvent } from './events/project-updated.event.js';

// Event handlers
import { ProjectActivityHandler } from './handlers/project-activity.handler.js';

// Re-export commands for external use
export { CreateProjectCommand } from './commands/create-project.command.js';
export { DeleteProjectCommand } from './commands/delete-project.command.js';
export {
  UpdateProjectCommand,
  type UpdateProjectInput,
} from './commands/update-project.command.js';

// Re-export queries
export { GetProjectActivityQuery } from './queries/get-project-activity.query.js';
export { GetProjectStatsQuery } from './queries/get-project-stats.query.js';
export { GetProjectTreeQuery } from './queries/get-project-tree.query.js';
export { GetProjectQuery, type GetProjectResult } from './queries/get-project.query.js';
export { ListProjectsQuery } from './queries/list-projects.query.js';

// Re-export events
export { ProjectCreatedEvent } from './events/project-created.event.js';
export { ProjectDeletedEvent } from './events/project-deleted.event.js';
export { ProjectUpdatedEvent } from './events/project-updated.event.js';

// Re-export types
export type {
  CreateProjectInput,
  ProjectStats,
  ProjectTree,
  ProjectWithLanguages,
  ProjectWithStatsAndRole,
  UpdateProjectInput as RepositoryUpdateProjectInput,
} from './project.repository.js';

// Type-safe handler registrations
const commandRegistrations = [
  defineCommandHandler(CreateProjectCommand, CreateProjectHandler, 'createProjectHandler'),
  defineCommandHandler(UpdateProjectCommand, UpdateProjectHandler, 'updateProjectHandler'),
  defineCommandHandler(DeleteProjectCommand, DeleteProjectHandler, 'deleteProjectHandler'),
];

const queryRegistrations = [
  defineQueryHandler(ListProjectsQuery, ListProjectsHandler, 'listProjectsHandler'),
  defineQueryHandler(GetProjectQuery, GetProjectHandler, 'getProjectHandler'),
  defineQueryHandler(GetProjectStatsQuery, GetProjectStatsHandler, 'getProjectStatsHandler'),
  defineQueryHandler(GetProjectTreeQuery, GetProjectTreeHandler, 'getProjectTreeHandler'),
  defineQueryHandler(
    GetProjectActivityQuery,
    GetProjectActivityHandler,
    'getProjectActivityHandler'
  ),
];

const eventRegistrations = [
  defineEventHandler(ProjectCreatedEvent, ProjectActivityHandler, 'projectActivityHandler'),
  defineEventHandler(ProjectUpdatedEvent, ProjectActivityHandler, 'projectActivityHandler'),
  defineEventHandler(ProjectDeletedEvent, ProjectActivityHandler, 'projectActivityHandler'),
];

/**
 * Register project module handlers with the container.
 */
export function registerProjectModule(container: AwilixContainer<Cradle>): void {
  // Register repository
  container.register({
    projectRepository: asClass(ProjectRepository).singleton(),
  });

  // Register command handlers
  container.register({
    createProjectHandler: asClass(CreateProjectHandler).singleton(),
    updateProjectHandler: asClass(UpdateProjectHandler).singleton(),
    deleteProjectHandler: asClass(DeleteProjectHandler).singleton(),
  });

  // Register query handlers
  container.register({
    listProjectsHandler: asClass(ListProjectsHandler).singleton(),
    getProjectHandler: asClass(GetProjectHandler).singleton(),
    getProjectStatsHandler: asClass(GetProjectStatsHandler).singleton(),
    getProjectTreeHandler: asClass(GetProjectTreeHandler).singleton(),
    getProjectActivityHandler: asClass(GetProjectActivityHandler).singleton(),
  });

  // Register event handler (single instance handles all project events)
  container.register({
    projectActivityHandler: asClass(ProjectActivityHandler).singleton(),
  });

  // Register with buses using type-safe registrations
  const commandBus = container.resolve('commandBus');
  registerCommandHandlers(commandBus, commandRegistrations);

  const queryBus = container.resolve('queryBus');
  registerQueryHandlers(queryBus, queryRegistrations);

  const eventBus = container.resolve('eventBus');
  registerEventHandlers(eventBus, eventRegistrations);
}
