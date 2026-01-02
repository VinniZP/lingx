# MCP Server for Lingx - Feature Specification

## 1. Problem Statement

### What problem does this solve?

Developers using AI assistants (Claude, Cursor, Windsurf, etc.) for translation management workflows currently lack native integration with Lingx. They must manually switch between the AI assistant and CLI/web UI, copy-paste commands, and interpret results without AI assistance. This friction slows down translation workflows and prevents AI assistants from providing contextual help.

### Who are the primary users/beneficiaries?

- **Developers** integrating Lingx into their applications who use AI-powered IDEs
- **Product teams** managing translations who use AI assistants
- **Anyone** wanting AI assistance for translation conflict resolution, quality checks, and key management

### Why is this needed now?

- MCP has become the de facto standard for tool integration across AI assistants
- The [official TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) is mature (used by GitHub, Slack, Google Drive)
- Claude Desktop, Cursor, Windsurf, and VS Code all support MCP
- Competitor translation management systems are adding AI integrations

### Success criteria and metrics

- All CLI functionality accessible via MCP tools
- AI assistants can provide contextual guidance for conflicts and issues
- Configuration works seamlessly in Claude Desktop, Cursor, and other MCP clients
- Response time comparable to CLI execution

---

## 2. Deployment Model

### Chosen Approach: Stdio Transport (Local Process)

The MCP server runs as a local process via `lingx mcp` command, communicating over stdin/stdout.

| Factor | Stdio | HTTP/SSE | Hybrid |
|--------|-------|----------|--------|
| **Setup complexity** | Low - single command | High - server hosting | High |
| **Auth handling** | Uses existing CLI credentials | Requires separate auth | Complex |
| **Latency** | Low (local execution) | Variable (network) | Variable |
| **File system access** | Native (same machine) | Requires permissions | Native |
| **Client support** | Universal | Limited/beta | Partial |
| **Maintenance** | None | Server infrastructure | Both |

### Rationale

1. **Client Compatibility**: Claude Desktop primarily uses stdio. Cursor supports stdio natively.

2. **Existing CLI Architecture**: The CLI already handles authentication via `credentialStore` and config loading via `loadConfig()`. Reusing this avoids duplicating auth flows.

3. **File System Operations**: Commands like `extract`, `check`, and `types` require reading/writing local files. Stdio transport means the MCP server runs in the same context as the project.

4. **Distribution**: Embedding as `lingx mcp` keeps it part of the existing package - no separate installation.

5. **Security**: No exposed HTTP endpoints. Uses existing API key authentication to Lingx backend.

### Future Consideration: HTTP Transport

HTTP transport could be added later for:
- Cloud-hosted Lingx instances with centralized MCP endpoint
- CI/CD integrations where stdin/stdout is not available
- Multi-user scenarios requiring shared context

---

## 3. MCP Tools

### 3.1 Core CLI Operations

#### `lingx_pull`

Download translations from platform to local files.

```typescript
{
  name: "lingx_pull",
  description: "Download translations from Lingx platform to local files. Use when you need to get the latest translations from the server.",
  parameters: z.object({
    project: z.string().optional().describe("Project slug (uses config default if omitted)"),
    space: z.string().optional().describe("Space slug (uses config default if omitted)"),
    branch: z.string().optional().describe("Branch name (default: main)"),
    language: z.string().optional().describe("Specific language code to pull (default: all)"),
  }),
  returns: {
    success: boolean,
    filesWritten: number,
    languages: string[],
    keyCount: number,
  }
}
```

#### `lingx_push`

Upload local translations to the platform.

```typescript
{
  name: "lingx_push",
  description: "Upload local translation files to Lingx platform. Detects conflicts and can resolve them.",
  parameters: z.object({
    project: z.string().optional(),
    space: z.string().optional(),
    branch: z.string().optional(),
    languages: z.array(z.string()).optional().describe("Languages to push (default: all)"),
    force: z.boolean().optional().describe("Force push, overwrite conflicts"),
    delete: z.boolean().optional().describe("Delete remote keys not present locally"),
  }),
  returns: {
    success: boolean,
    keysUploaded: number,
    conflicts: Array<{ key: string, localValue: string, remoteValue: string }>,
    deleted: number,
  }
}
```

#### `lingx_sync`

Bidirectional sync between local and remote.

```typescript
{
  name: "lingx_sync",
  description: "Bidirectional sync between local files and Lingx platform. Merges changes from both sides.",
  parameters: z.object({
    project: z.string().optional(),
    space: z.string().optional(),
    branch: z.string().optional(),
    forceLocal: z.boolean().optional().describe("Resolve conflicts using local values"),
    forceRemote: z.boolean().optional().describe("Resolve conflicts using remote values"),
  }),
  returns: {
    uploaded: number,
    downloaded: number,
    conflicts: Array<{
      key: string,
      lang: string,
      localValue: string,
      remoteValue: string,
    }>,
  }
}
```

#### `lingx_extract`

Extract translation keys from source code.

```typescript
{
  name: "lingx_extract",
  description: "Extract translation keys from source code. Identifies t(), useTranslation(), and tKey() calls.",
  parameters: z.object({
    source: z.string().optional().describe("Source directory to scan"),
    detectIcu: z.boolean().optional().describe("Detect ICU MessageFormat variables"),
    sync: z.boolean().optional().describe("Sync extracted keys to locale files"),
    clean: z.boolean().optional().describe("Remove unused keys from locale files"),
  }),
  returns: {
    totalKeys: number,
    byNamespace: Record<string, number>,
    newKeys: string[],
    unusedKeys: string[],
  }
}
```

#### `lingx_check`

Validate translation coverage and quality.

```typescript
{
  name: "lingx_check",
  description: "Check translation coverage, validate ICU syntax, and run quality checks. Essential for CI/CD pipelines.",
  parameters: z.object({
    project: z.string().optional(),
    space: z.string().optional(),
    branch: z.string().optional(),
    missing: z.boolean().optional().describe("Check for keys in code but not in platform"),
    unused: z.boolean().optional().describe("Check for keys in platform but not in code"),
    validateIcu: z.boolean().optional().describe("Validate ICU MessageFormat syntax"),
    quality: z.boolean().optional().describe("Run quality checks (placeholders, whitespace)"),
  }),
  returns: {
    passed: boolean,
    codeKeys: number,
    platformKeys: number,
    missingKeys: string[],
    unusedKeys: string[],
    icuErrors: Array<{ key: string, lang: string, error: string }>,
    qualityIssues: Array<{ key: string, lang: string, issue: string, severity: string }>,
  }
}
```

#### `lingx_types`

Generate TypeScript types from translations.

```typescript
{
  name: "lingx_types",
  description: "Generate TypeScript types from translation files for type-safe translations.",
  parameters: z.object({
    output: z.string().optional().describe("Output file path"),
    locale: z.string().optional().describe("Source locale to use (default: en)"),
  }),
  returns: {
    success: boolean,
    outputPath: string,
    keyCount: number,
    keysWithParams: number,
    namespaceCount: number,
  }
}
```

### 3.2 Key Management

#### `lingx_key_add`

Add a new translation key.

```typescript
{
  name: "lingx_key_add",
  description: "Add a new translation key to local files. Optionally push to remote.",
  parameters: z.object({
    key: z.string().describe("Key name (supports namespace:key format)"),
    namespace: z.string().optional(),
    value: z.string().optional().describe("Default value for all languages"),
    values: z.record(z.string()).optional().describe("Language-specific values { en: 'Hello', de: 'Hallo' }"),
    push: z.boolean().optional().describe("Push to remote API"),
  }),
  returns: {
    success: boolean,
    key: string,
    languagesUpdated: number,
  }
}
```

#### `lingx_key_remove`

Remove a translation key.

```typescript
{
  name: "lingx_key_remove",
  description: "Remove a translation key from local files. Optionally delete from remote.",
  parameters: z.object({
    key: z.string().describe("Key name (supports namespace:key format)"),
    namespace: z.string().optional(),
    push: z.boolean().optional().describe("Delete from remote API"),
  }),
  returns: {
    success: boolean,
    key: string,
    languagesUpdated: number,
  }
}
```

#### `lingx_key_move`

Move/rename a translation key.

```typescript
{
  name: "lingx_key_move",
  description: "Move or rename a translation key, preserving all values across languages.",
  parameters: z.object({
    source: z.string().describe("Source key (namespace:key format)"),
    target: z.string().describe("Target key (namespace:key format)"),
    push: z.boolean().optional().describe("Push changes to remote API"),
  }),
  returns: {
    success: boolean,
    from: string,
    to: string,
    languagesMoved: number,
  }
}
```

### 3.3 Branch Operations

#### `lingx_branch_list`

List branches in a space.

```typescript
{
  name: "lingx_branch_list",
  description: "List all branches in a Lingx space.",
  parameters: z.object({
    project: z.string().optional(),
    space: z.string().optional(),
  }),
  returns: {
    branches: Array<{ name: string, keyCount: number, createdAt: string }>,
  }
}
```

#### `lingx_branch_create`

Create a new branch.

```typescript
{
  name: "lingx_branch_create",
  description: "Create a new translation branch, copying keys from a source branch.",
  parameters: z.object({
    name: z.string().describe("New branch name"),
    from: z.string().optional().describe("Source branch (default: main)"),
    project: z.string().optional(),
    space: z.string().optional(),
  }),
  returns: {
    success: boolean,
    name: string,
    keyCount: number,
  }
}
```

#### `lingx_branch_diff`

Compare two branches.

```typescript
{
  name: "lingx_branch_diff",
  description: "Compare two branches and show differences in translations.",
  parameters: z.object({
    source: z.string().describe("Source branch name"),
    target: z.string().optional().describe("Target branch (default: main)"),
    project: z.string().optional(),
    space: z.string().optional(),
  }),
  returns: {
    added: Array<{ key: string, translations: Record<string, string> }>,
    removed: Array<{ key: string }>,
    modified: Array<{ key: string, changes: Record<string, { old: string, new: string }> }>,
    conflicts: Array<{ key: string, source: Record<string, string>, target: Record<string, string> }>,
  }
}
```

#### `lingx_branch_merge`

Merge a branch into another.

```typescript
{
  name: "lingx_branch_merge",
  description: "Merge a source branch into a target branch.",
  parameters: z.object({
    source: z.string().describe("Source branch name"),
    into: z.string().optional().describe("Target branch (default: main)"),
    force: z.boolean().optional().describe("Force merge, overwrite conflicts with source values"),
    resolutions: z.array(z.object({
      key: z.string(),
      resolution: z.enum(["source", "target"]),
    })).optional().describe("Conflict resolutions"),
    project: z.string().optional(),
    space: z.string().optional(),
  }),
  returns: {
    success: boolean,
    merged: number,
    conflicts: Array<{ key: string, source: Record<string, string>, target: Record<string, string> }>,
  }
}
```

### 3.4 Search and Query Tools

#### `lingx_search_keys`

Search keys by name pattern.

```typescript
{
  name: "lingx_search_keys",
  description: "Search translation keys by name pattern. Supports glob patterns.",
  parameters: z.object({
    pattern: z.string().describe("Search pattern (e.g., 'button.*', '*error*')"),
    namespace: z.string().optional().describe("Filter by namespace"),
    includeValues: z.boolean().optional().describe("Include translation values in results"),
  }),
  returns: {
    keys: Array<{
      key: string,
      namespace: string | null,
      translations?: Record<string, string>,
    }>,
    total: number,
  }
}
```

#### `lingx_search_translations`

Search by translation value.

```typescript
{
  name: "lingx_search_translations",
  description: "Search keys by their translation values. Useful for finding existing translations or duplicates.",
  parameters: z.object({
    query: z.string().describe("Text to search for in translation values"),
    language: z.string().optional().describe("Language to search in (default: source locale)"),
    exactMatch: z.boolean().optional().describe("Require exact match vs substring"),
  }),
  returns: {
    results: Array<{
      key: string,
      namespace: string | null,
      matchedLanguage: string,
      matchedValue: string,
      allTranslations: Record<string, string>,
    }>,
    total: number,
  }
}
```

#### `lingx_find_similar_keys`

Find similar or potentially duplicate keys.

```typescript
{
  name: "lingx_find_similar_keys",
  description: "Find keys with similar names or similar translation values. Helps identify duplicates.",
  parameters: z.object({
    key: z.string().optional().describe("Find keys similar to this key"),
    threshold: z.number().optional().describe("Similarity threshold 0-1 (default: 0.7)"),
    checkValues: z.boolean().optional().describe("Also check translation value similarity"),
  }),
  returns: {
    similar: Array<{
      key1: string,
      key2: string,
      nameSimilarity: number,
      valueSimilarity?: number,
      suggestion: string,
    }>,
  }
}
```

### 3.5 AI Assistance Tools

#### `lingx_analyze_conflict`

Get AI-friendly analysis of a translation conflict.

```typescript
{
  name: "lingx_analyze_conflict",
  description: "Analyze a translation conflict and provide resolution guidance. Use this when sync or push reports conflicts.",
  parameters: z.object({
    key: z.string(),
    localValue: z.string(),
    remoteValue: z.string(),
    language: z.string(),
    context: z.string().optional().describe("Additional context about the change"),
  }),
  returns: {
    analysis: {
      localChanges: string[],
      remoteChanges: string[],
      recommendation: "use_local" | "use_remote" | "merge" | "needs_review",
      reasoning: string,
      suggestedMerge?: string,
    },
  }
}
```

#### `lingx_suggest_key_name`

Suggest a key name based on the translation value.

```typescript
{
  name: "lingx_suggest_key_name",
  description: "Suggest a translation key name based on the English value. Follows project naming conventions.",
  parameters: z.object({
    value: z.string().describe("The English translation value"),
    context: z.string().optional().describe("Where this translation is used (e.g., 'login button')"),
    namespace: z.string().optional().describe("Target namespace"),
  }),
  returns: {
    suggestions: Array<{
      key: string,
      rationale: string,
    }>,
    existingSimilar: string[],
  }
}
```

#### `lingx_check_quality_issues`

Analyze quality issues and suggest fixes.

```typescript
{
  name: "lingx_check_quality_issues",
  description: "Get detailed analysis of quality issues from check command and suggested fixes.",
  parameters: z.object({
    key: z.string(),
    sourceValue: z.string(),
    targetValue: z.string(),
    sourceLanguage: z.string(),
    targetLanguage: z.string(),
  }),
  returns: {
    issues: Array<{
      type: "missing_placeholder" | "extra_placeholder" | "whitespace" | "punctuation" | "length",
      severity: "error" | "warning",
      description: string,
      suggestedFix: string,
    }>,
  }
}
```

#### `lingx_validate_icu`

Validate ICU MessageFormat syntax with suggestions.

```typescript
{
  name: "lingx_validate_icu",
  description: "Validate ICU MessageFormat syntax and suggest corrections.",
  parameters: z.object({
    value: z.string().describe("The translation value to validate"),
    language: z.string().optional(),
  }),
  returns: {
    valid: boolean,
    errors: Array<{
      position: number,
      message: string,
      suggestion: string,
    }>,
    detectedPatterns: Array<"plural" | "select" | "date" | "number" | "selectordinal">,
    variables: string[],
  }
}
```

### 3.6 Context and Status

#### `lingx_status`

Get current project status.

```typescript
{
  name: "lingx_status",
  description: "Get current Lingx configuration and connection status.",
  parameters: z.object({}),
  returns: {
    authenticated: boolean,
    configFile: string | null,
    project: string | null,
    space: string | null,
    branch: string,
    sourceLocale: string,
    translationsPath: string,
    sourcePath: string,
  }
}
```

#### `lingx_get_config`

Get current configuration.

```typescript
{
  name: "lingx_get_config",
  description: "Get the current Lingx configuration from lingx.config.ts or .lingx.yml.",
  parameters: z.object({}),
  returns: {
    config: LingxConfig,
    configPath: string | null,
  }
}
```

---

## 4. MCP Resources

Resources provide read-only access to project data.

### `lingx://config`

Current project configuration.

```typescript
{
  uri: "lingx://config",
  name: "Lingx Configuration",
  description: "Current project configuration from lingx.config.ts",
  mimeType: "application/json",
}
```

### `lingx://translations/{language}`

Translation file contents.

```typescript
{
  uri: "lingx://translations/{language}",
  name: "Translation File",
  description: "Contents of a translation file",
  mimeType: "application/json",
}
```

### `lingx://keys`

List all translation keys.

```typescript
{
  uri: "lingx://keys",
  name: "Translation Keys",
  description: "List of all translation keys with metadata",
  mimeType: "application/json",
}
```

---

## 5. Prompt Templates

Prompts help users interact with the MCP server consistently.

### `lingx_resolve_conflicts`

```typescript
{
  name: "lingx_resolve_conflicts",
  description: "Guide for resolving translation conflicts",
  arguments: [
    { name: "conflicts", description: "JSON array of conflicts from sync/push" }
  ],
  template: `You are helping resolve translation conflicts in a Lingx project.

For each conflict:
1. Compare the local and remote values
2. Consider the context and which value is more recent/correct
3. Use lingx_analyze_conflict to get detailed analysis
4. Recommend a resolution

Conflicts to resolve:
{{conflicts}}`
}
```

### `lingx_fix_quality_issues`

```typescript
{
  name: "lingx_fix_quality_issues",
  description: "Guide for fixing quality issues from check command",
  arguments: [
    { name: "issues", description: "JSON array of quality issues" }
  ],
  template: `You are helping fix translation quality issues in a Lingx project.

Common issues and fixes:
- Missing placeholders: Ensure all {variables} from source are in translation
- Extra whitespace: Check for leading/trailing spaces
- Punctuation mismatch: Match the source's ending punctuation

Issues to fix:
{{issues}}

For each issue, use lingx_check_quality_issues to get suggested fixes.`
}
```

### `lingx_add_translation`

```typescript
{
  name: "lingx_add_translation",
  description: "Guide for adding new translations",
  arguments: [
    { name: "feature_description", description: "Description of the feature/UI element" }
  ],
  template: `You are helping add new translations for: {{feature_description}}

Steps:
1. Use lingx_suggest_key_name to get key name suggestions
2. Use lingx_search_translations to check for existing similar translations
3. Use lingx_key_add to add the new key with values
4. Use lingx_types to regenerate TypeScript types`
}
```

---

## 6. Architecture and Implementation

### 6.1 File Structure

```
packages/cli/
├── src/
│   ├── mcp/
│   │   ├── index.ts           # MCP server entry point
│   │   ├── server.ts          # McpServer setup
│   │   ├── tools/
│   │   │   ├── index.ts       # Tool registry
│   │   │   ├── core.ts        # pull, push, sync, extract, check, types
│   │   │   ├── keys.ts        # key add, remove, move
│   │   │   ├── branches.ts    # branch operations
│   │   │   ├── search.ts      # search, find similar
│   │   │   └── ai.ts          # AI assistance tools
│   │   ├── resources/
│   │   │   └── index.ts       # Resource definitions
│   │   └── prompts/
│   │       └── index.ts       # Prompt templates
│   ├── commands/
│   │   └── mcp.ts             # `lingx mcp` command
│   └── ...existing files...
├── package.json
└── ...
```

### 6.2 Reusing Existing CLI Code

The MCP tools should reuse existing command logic:

```typescript
// src/mcp/tools/core.ts
import { loadConfig } from '../../lib/config.js';
import { createApiClientFromConfig } from '../../lib/api.js';
import { createExtractor } from '../../lib/extractor/index.js';
// ... reuse all existing modules

export function registerCoreTools(server: McpServer) {
  server.tool(
    "lingx_pull",
    {
      project: z.string().optional(),
      space: z.string().optional(),
      branch: z.string().optional(),
      language: z.string().optional(),
    },
    async (args) => {
      const cwd = process.cwd();
      const config = await loadConfig(cwd);
      // ... reuse pull logic from commands/pull.ts
    }
  );
}
```

### 6.3 MCP Command Entry Point

```typescript
// src/commands/mcp.ts
import { Command } from 'commander';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAllTools } from '../mcp/tools/index.js';
import { registerResources } from '../mcp/resources/index.js';
import { registerPrompts } from '../mcp/prompts/index.js';

export function createMcpCommand(): Command {
  return new Command('mcp')
    .description('Start MCP server for AI assistant integration')
    .action(async () => {
      const server = new McpServer({
        name: "lingx",
        version: "0.1.0",
      });

      registerAllTools(server);
      registerResources(server);
      registerPrompts(server);

      const transport = new StdioServerTransport();
      await server.connect(transport);
    });
}
```

### 6.4 Dependencies to Add

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.25.0"
  }
}
```

Note: The SDK requires `zod` as a peer dependency.

---

## 7. Client Configuration Examples

### Claude Desktop

Location: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

```json
{
  "mcpServers": {
    "lingx": {
      "command": "npx",
      "args": ["@lingx/cli", "mcp"],
      "env": {}
    }
  }
}
```

Or with a local installation:

```json
{
  "mcpServers": {
    "lingx": {
      "command": "node",
      "args": ["/path/to/project/node_modules/@lingx/cli/bin/lingx.js", "mcp"]
    }
  }
}
```

### Cursor IDE

Location: `~/.cursor/mcp.json` or `.cursor/mcp.json` in project

```json
{
  "mcpServers": {
    "lingx": {
      "command": "npx",
      "args": ["@lingx/cli", "mcp"]
    }
  }
}
```

### VS Code with Continue

```json
{
  "mcpServers": [
    {
      "name": "lingx",
      "command": "npx",
      "args": ["@lingx/cli", "mcp"]
    }
  ]
}
```

### Claude Code

Location: `.mcp.json` in project root or `~/.claude/mcp.json`

```json
{
  "mcpServers": {
    "lingx": {
      "command": "npx",
      "args": ["@lingx/cli", "mcp"]
    }
  }
}
```

---

## 8. Open Questions and Risks

### Open Questions

1. **Remote HTTP Transport**: Should we add HTTP/SSE transport for cloud deployments? Deferred for v2.
2. **Rate Limiting**: Should MCP tools have rate limiting for API calls? May not be needed for local use.
3. **Caching**: Should translations be cached in the MCP server between calls? Could improve performance for search operations.
4. **Streaming**: Some operations (like extract on large codebases) might benefit from streaming progress updates.

### Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| MCP SDK breaking changes | High | Pin version, follow release notes |
| Long-running operations timeout | Medium | Implement progress reporting, chunked responses |
| Auth credential exposure | High | Never expose credentials in tool responses |
| File system access scope | Medium | Respect .gitignore, only access project files |

---

## 9. Effort Estimate

### Total: 8-12 story points

| Component | Estimate | Notes |
|-----------|----------|-------|
| MCP server setup | 1 SP | Server scaffolding, transport setup |
| Core tools (pull, push, sync, extract, check, types) | 3 SP | Reuse existing command logic |
| Key management tools | 1 SP | Wrapper around existing key commands |
| Branch tools | 1 SP | Wrapper around existing branch commands |
| Search tools | 2 SP | New functionality, may need API endpoints |
| AI assistance tools | 2 SP | New logic for conflict analysis, suggestions |
| Resources and Prompts | 1 SP | Configuration, templates |
| Testing and documentation | 1 SP | Integration tests, README updates |

---

## 10. References

- [Official TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Specification](https://modelcontextprotocol.io/specification/2025-06-18)
- [@modelcontextprotocol/sdk on npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [Claude Desktop Extensions](https://www.anthropic.com/engineering/desktop-extensions)
- [Cursor MCP Documentation](https://cursor.com/docs/context/mcp)
- [GitHub MCP Server](https://github.com/github/github-mcp-server)
- [MCP Servers Collection](https://github.com/modelcontextprotocol/servers)
