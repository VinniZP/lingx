import { parse, type ParserPlugin } from '@babel/parser';
import _traverse from '@babel/traverse';
import generate from '@babel/generator';
import {
  isIdentifier,
  isStringLiteral,
  isTemplateLiteral,
  isMemberExpression,
  isVariableDeclarator,
  type CallExpression,
  type Expression,
  type SpreadElement,
  type ArgumentPlaceholder,
  type Comment,
  type FunctionDeclaration,
  type ArrowFunctionExpression,
  type ClassDeclaration,
} from '@babel/types';
import type { NodePath, TraverseOptions } from '@babel/traverse';
import type {
  ExtractorOptions,
  Extractor,
  ExtractedKey,
  ExtractionResult,
  ExtractionError,
  ComponentContext,
  ComponentType,
} from './index.js';
import { combineKey } from '@lingx/shared';
import type { File } from '@babel/types';

// Handle ESM/CJS interop - Babel exports default differently
type TraverseFn = (ast: File, opts: TraverseOptions<unknown>) => void;
const traverse: TraverseFn = (
  typeof _traverse === 'function'
    ? _traverse
    : (_traverse as { default: TraverseFn }).default
) as TraverseFn;

// Handle ESM/CJS interop for generator
type GeneratorFn = (ast: CallExpression) => { code: string };
const generateCode: GeneratorFn = (
  typeof generate === 'function'
    ? generate
    : (generate as { default: GeneratorFn }).default
) as GeneratorFn;

/**
 * Dynamic translation functions that accept TranslationKey (from tKey).
 * These are allowed to have variable arguments and are NOT extracted or errored.
 */
const DYNAMIC_TRANSLATION_FUNCTIONS = new Set(['td']);

/**
 * Extracts translation keys from Next.js/React source code using AST parsing.
 *
 * Supports:
 * - t('key') function calls
 * - tKey('key') marker function calls
 * - td() dynamic translation (ignored - uses TranslationKey from tKey)
 * - useTranslation('namespace') for namespace prefixing
 * - i18n.t('key'), this.t('key') member expressions
 * - Template literals with static strings
 * - JSX and TypeScript syntax
 * - Magic comments: @lingx-skip, @lingx-key
 */
export class NextjsExtractor implements Extractor {
  private functions: Set<string>;
  private markerFunctions: Set<string>;
  private dynamicFunctions: Set<string>;

  constructor(options: ExtractorOptions) {
    this.functions = new Set(options.functions);
    // Always include 'tKey' as a marker function
    this.markerFunctions = new Set(options.markerFunctions ?? ['tKey']);
    // Dynamic translation functions are always ignored
    this.dynamicFunctions = DYNAMIC_TRANSLATION_FUNCTIONS;
  }

  extractFromCode(code: string, filePath?: string): string[] {
    const result = this.extract(code, filePath);
    return result.keys.map(d => d.key);
  }

  extractFromCodeWithDetails(code: string, filePath?: string): ExtractedKey[] {
    const result = this.extract(code, filePath);
    return result.keys;
  }

  extract(code: string, filePath?: string): ExtractionResult {
    const keys: ExtractedKey[] = [];
    const errors: ExtractionError[] = [];
    let currentNamespace: string | undefined;
    let currentComponent: ComponentContext | undefined;
    const functionsSet = this.functions;
    const markerFunctionsSet = this.markerFunctions;

    try {
      const plugins: ParserPlugin[] = ['jsx', 'typescript'];
      const ast = parse(code, {
        sourceType: 'module',
        plugins,
        errorRecovery: true,
      });

      // Process comments for @lingx-skip and @lingx-key
      const skipLines = new Set<number>();
      const commentKeys: ExtractedKey[] = [];

      for (const comment of (ast.comments ?? []) as Comment[]) {
        const text = comment.value.trim();

        // @lingx-skip - skip the next line
        if (text === '@lingx-skip') {
          if (comment.loc) {
            skipLines.add(comment.loc.end.line + 1);
          }
        }

        // @lingx-key key.name - extract key from comment
        const keyMatch = text.match(/^@lingx-key\s+(\S+)/);
        if (keyMatch) {
          commentKeys.push({
            key: keyMatch[1],
            source: 'comment',
            location: filePath && comment.loc
              ? {
                  file: filePath,
                  line: comment.loc.start.line,
                  column: comment.loc.start.column,
                }
              : undefined,
          });
        }
      }

      const dynamicFunctionsSet = this.dynamicFunctions;

      // Stack to track nested component contexts
      const componentStack: ComponentContext[] = [];

      /**
       * Detect component type from function name.
       */
      function detectComponentType(name: string): ComponentType | null {
        // React hooks: useXxx
        if (/^use[A-Z]/.test(name)) return 'hook';
        // React components: PascalCase
        if (/^[A-Z]/.test(name)) return 'function';
        return null;
      }

      traverse(ast, {
        // Track function declarations
        FunctionDeclaration: {
          enter(path: NodePath<FunctionDeclaration>) {
            const name = path.node.id?.name;
            if (name) {
              const type = detectComponentType(name);
              if (type) {
                const context: ComponentContext = { name, type };
                componentStack.push(context);
                currentComponent = context;
              }
            }
          },
          exit(path: NodePath<FunctionDeclaration>) {
            const name = path.node.id?.name;
            if (name && detectComponentType(name)) {
              componentStack.pop();
              currentComponent = componentStack[componentStack.length - 1];
            }
          },
        },

        // Track arrow functions assigned to variables
        ArrowFunctionExpression: {
          enter(path: NodePath<ArrowFunctionExpression>) {
            const parent = path.parent;
            if (isVariableDeclarator(parent) && isIdentifier(parent.id)) {
              const name = parent.id.name;
              const type = detectComponentType(name);
              if (type) {
                const context: ComponentContext = { name, type: 'arrow' };
                componentStack.push(context);
                currentComponent = context;
              }
            }
          },
          exit(path: NodePath<ArrowFunctionExpression>) {
            const parent = path.parent;
            if (isVariableDeclarator(parent) && isIdentifier(parent.id)) {
              const name = parent.id.name;
              if (detectComponentType(name)) {
                componentStack.pop();
                currentComponent = componentStack[componentStack.length - 1];
              }
            }
          },
        },

        // Track class declarations (for class components)
        ClassDeclaration: {
          enter(path: NodePath<ClassDeclaration>) {
            const name = path.node.id?.name;
            if (name && /^[A-Z]/.test(name)) {
              const context: ComponentContext = { name, type: 'class' };
              componentStack.push(context);
              currentComponent = context;
            }
          },
          exit(path: NodePath<ClassDeclaration>) {
            const name = path.node.id?.name;
            if (name && /^[A-Z]/.test(name)) {
              componentStack.pop();
              currentComponent = componentStack[componentStack.length - 1];
            }
          },
        },

        CallExpression(path: NodePath<CallExpression>) {
          const callee = path.node.callee;
          const loc = path.node.loc;

          // Check if this line should be skipped
          if (loc && skipLines.has(loc.start.line)) {
            return;
          }

          // Skip dynamic translation functions (td) - they use TranslationKey from tKey
          if (
            isIdentifier(callee) &&
            dynamicFunctionsSet.has(callee.name)
          ) {
            return;
          }

          // Check for useTranslation('namespace') calls to capture namespace
          if (
            isIdentifier(callee) &&
            callee.name === 'useTranslation' &&
            path.node.arguments.length > 0
          ) {
            const arg = path.node.arguments[0];
            if (isStringLiteral(arg)) {
              currentNamespace = arg.value;
            }
          }

          // Check for marker function calls (tKey, etc.)
          // tKey('key') - root key
          // tKey('key', 'namespace') - namespaced key
          if (
            isIdentifier(callee) &&
            markerFunctionsSet.has(callee.name)
          ) {
            const keyValue = extractKeyFromArgs(path.node.arguments);
            if (keyValue) {
              // Extract optional namespace from second argument
              let markerNamespace: string | undefined;
              if (path.node.arguments.length > 1) {
                const nsArg = path.node.arguments[1];
                if (isStringLiteral(nsArg)) {
                  markerNamespace = nsArg.value;
                }
              }

              // Combine namespace + key using internal delimiter
              const fullKey = combineKey(markerNamespace ?? null, keyValue);

              keys.push({
                key: fullKey,
                source: 'marker',
                namespace: markerNamespace,
                location: filePath && loc
                  ? {
                      file: filePath,
                      line: loc.start.line,
                      column: loc.start.column,
                    }
                  : undefined,
                componentContext: currentComponent ? { ...currentComponent } : undefined,
              });
            }
            // Marker functions should always have static keys
            if (!keyValue && path.node.arguments.length > 0) {
              errors.push({
                message: 'Marker function requires a static string key',
                location: {
                  file: filePath ?? '<unknown>',
                  line: loc?.start.line ?? 0,
                  column: loc?.start.column ?? 0,
                },
                code: generateCodeSafe(path.node),
              });
            }
          }

          // Check for t('key') calls - direct function call
          // Skip useTranslation since it's used for namespace, not key extraction
          if (
            isIdentifier(callee) &&
            functionsSet.has(callee.name) &&
            callee.name !== 'useTranslation' &&
            !markerFunctionsSet.has(callee.name)
          ) {
            const keyValue = extractKeyFromArgs(path.node.arguments);
            if (keyValue) {
              const fullKey = combineKey(currentNamespace ?? null, keyValue);
              keys.push({
                key: fullKey,
                source: 'function',
                namespace: currentNamespace,
                location: filePath && loc
                  ? {
                      file: filePath,
                      line: loc.start.line,
                      column: loc.start.column,
                    }
                  : undefined,
                componentContext: currentComponent ? { ...currentComponent } : undefined,
              });
            } else if (path.node.arguments.length > 0) {
              // Dynamic key detected - this is an error
              errors.push({
                message: 'Dynamic key detected - wrap with tKey() or use @lingx-key comment',
                location: {
                  file: filePath ?? '<unknown>',
                  line: loc?.start.line ?? 0,
                  column: loc?.start.column ?? 0,
                },
                code: generateCodeSafe(path.node),
              });
            }
          }

          // Check for t('key') as member expression (this.t, i18n.t, etc.)
          if (
            isMemberExpression(callee) &&
            isIdentifier(callee.property) &&
            functionsSet.has(callee.property.name)
          ) {
            const keyValue = extractKeyFromArgs(path.node.arguments);
            if (keyValue) {
              keys.push({
                key: keyValue,
                source: 'function',
                location: filePath && loc
                  ? {
                      file: filePath,
                      line: loc.start.line,
                      column: loc.start.column,
                    }
                  : undefined,
                componentContext: currentComponent ? { ...currentComponent } : undefined,
              });
            } else if (path.node.arguments.length > 0) {
              // Dynamic key detected - this is an error
              errors.push({
                message: 'Dynamic key detected - wrap with tKey() or use @lingx-key comment',
                location: {
                  file: filePath ?? '<unknown>',
                  line: loc?.start.line ?? 0,
                  column: loc?.start.column ?? 0,
                },
                code: generateCodeSafe(path.node),
              });
            }
          }
        },
      });

      // Add keys from comments
      keys.push(...commentKeys);

      // If there are errors, return empty keys
      if (errors.length > 0) {
        return { keys: [], errors };
      }

      return { keys, errors: [] };
    } catch (error) {
      // Parse error - return empty keys with error
      return {
        keys: [],
        errors: [{
          message: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          location: {
            file: filePath ?? '<unknown>',
            line: 0,
            column: 0,
          },
        }],
      };
    }
  }
}

/**
 * Extracts the key value from function call arguments.
 * Only extracts static string values or simple template literals.
 */
function extractKeyFromArgs(args: (Expression | SpreadElement | ArgumentPlaceholder)[]): string | undefined {
  if (args.length === 0) {
    return undefined;
  }

  const firstArg = args[0];

  // Direct string literal: t('key')
  if (isStringLiteral(firstArg)) {
    return firstArg.value;
  }

  // Simple template literal without expressions: t(`key`)
  if (isTemplateLiteral(firstArg)) {
    if (
      firstArg.quasis.length === 1 &&
      firstArg.expressions.length === 0
    ) {
      return firstArg.quasis[0].value.cooked ?? undefined;
    }
  }

  // Dynamic key - return undefined
  return undefined;
}

/**
 * Safely generate code string from AST node.
 */
function generateCodeSafe(node: CallExpression): string {
  try {
    return generateCode(node).code;
  } catch {
    return '<code generation failed>';
  }
}
