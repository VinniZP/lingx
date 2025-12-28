import { parse, type ParserPlugin } from '@babel/parser';
import _traverse from '@babel/traverse';
import {
  isIdentifier,
  isStringLiteral,
  isTemplateLiteral,
  isMemberExpression,
  type CallExpression,
  type Expression,
  type SpreadElement,
  type ArgumentPlaceholder,
} from '@babel/types';
import type { NodePath, TraverseOptions } from '@babel/traverse';
import type { ExtractorOptions, Extractor, ExtractedKey } from './index.js';
import type { File } from '@babel/types';

// Handle ESM/CJS interop - Babel exports default differently
type TraverseFn = (ast: File, opts: TraverseOptions<unknown>) => void;
const traverse: TraverseFn = (
  typeof _traverse === 'function'
    ? _traverse
    : (_traverse as { default: TraverseFn }).default
) as TraverseFn;

/**
 * Extracts translation keys from Next.js/React source code using AST parsing.
 *
 * Supports:
 * - t('key') function calls
 * - useTranslation('namespace') for namespace prefixing
 * - i18n.t('key'), this.t('key') member expressions
 * - Template literals with static strings
 * - JSX and TypeScript syntax
 */
export class NextjsExtractor implements Extractor {
  private functions: Set<string>;

  constructor(options: ExtractorOptions) {
    this.functions = new Set(options.functions);
  }

  extractFromCode(code: string, filePath?: string): string[] {
    const details = this.extractFromCodeWithDetails(code, filePath);
    return details.map(d => d.key);
  }

  extractFromCodeWithDetails(code: string, filePath?: string): ExtractedKey[] {
    const keys: ExtractedKey[] = [];
    let currentNamespace: string | undefined;
    const functionsSet = this.functions;

    try {
      const plugins: ParserPlugin[] = ['jsx', 'typescript'];
      const ast = parse(code, {
        sourceType: 'module',
        plugins,
        errorRecovery: true,
      });

      traverse(ast, {
        CallExpression(path: NodePath<CallExpression>) {
          const callee = path.node.callee;

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

          // Check for t('key') calls - direct function call
          // Skip useTranslation since it's used for namespace, not key extraction
          if (
            isIdentifier(callee) &&
            functionsSet.has(callee.name) &&
            callee.name !== 'useTranslation'
          ) {
            const keyValue = extractKeyFromArgs(path.node.arguments);
            if (keyValue) {
              const fullKey = currentNamespace ? `${currentNamespace}:${keyValue}` : keyValue;
              keys.push({
                key: fullKey,
                namespace: currentNamespace,
                location: filePath && path.node.loc
                  ? {
                      file: filePath,
                      line: path.node.loc.start.line,
                      column: path.node.loc.start.column,
                    }
                  : undefined,
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
                location: filePath && path.node.loc
                  ? {
                      file: filePath,
                      line: path.node.loc.start.line,
                      column: path.node.loc.start.column,
                    }
                  : undefined,
              });
            }
          }
        },
      });
    } catch (error) {
      // Parse error - return empty keys rather than failing
      // Log warning but don't crash the extraction process
      console.warn(`Parse error in ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return keys;
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

  // Dynamic key - skip
  return undefined;
}
