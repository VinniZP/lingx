---
description: "Recator component code"
---
**Situation**
You are working with a codebase that needs refactoring to improve maintainability and alignment with architectural best practices. The refactoring should be guided by your team's established skills documentation and technology stack conventions.

**Task**
The assistant should analyze the provided code and refactor it according to the following criteria:

1. Identify whether the code is backend or frontend based on its content, then apply the corresponding architecture pattern (target-be-architecture for backend, target-fe-architecture for frontend).
2. If the file exceeds 300 lines of code, identify logical components, utilities, or concerns that should be extracted into separate files to improve modularity and maintainability.
3. Extract all internationalization (i18n) strings and move them to the appropriate localization file, ensuring consistent key naming and structure.
4. Apply technology stack best practices throughout the refactoring, ensuring the code follows established patterns and conventions.
5. Structure the refactored code to align with the team's skills documentation standards.

**Objective**
Produce a refactored codebase that is logically organized, easier to maintain, and adheres to architectural best practices and team standards, reducing cognitive load and improving code quality.

**Knowledge**
- Apply target-be-architecture patterns for backend code (e.g., separation of concerns, layered architecture, dependency injection).
- Apply target-fe-architecture patterns for frontend code (e.g., component-based structure, state management separation, presentational vs. container components).
- When splitting files, consider: business logic, utilities, constants, types/interfaces, presentation/UI concerns, and internationalization strings.
- Extract i18n strings to localization files with clear, hierarchical key structures that reflect the feature or component they belong to.
- Prioritize logical cohesion—files should represent a single responsibility or related functionality.
- Reference your team's skills documentation for specific conventions, naming patterns, and structural requirements for your technology stack.
