import * as ts from "typescript";

const HOOK_NAMES = new Set([
  "useState", "useEffect", "useLayoutEffect", "useMemo", "useCallback", "useRef",
  "useReducer", "useContext", "useTransition", "useDeferredValue", "useId",
  "useSyncExternalStore", "useInsertionEffect",
]);

function needsClientDirective(filePath: string, content: string): boolean {
  if (!/\.(?:tsx|jsx)$/i.test(filePath)) return false;
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, filePath.endsWith(".jsx") ? ts.ScriptKind.JSX : ts.ScriptKind.TSX);
  const firstStatement = sourceFile.statements[0];
  if (firstStatement && ts.isExpressionStatement(firstStatement) && ts.isStringLiteral(firstStatement.expression) && firstStatement.expression.text === "use client") return false;

  const importedHooks = new Set<string>();
  let reactNamespace: string | null = null;
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== "react" || !statement.importClause) continue;
    const clause = statement.importClause;
    if (clause.name) reactNamespace = clause.name.text;
    if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const binding of clause.namedBindings.elements) {
        const imported = (binding.propertyName ?? binding.name).text;
        if (HOOK_NAMES.has(imported)) importedHooks.add(binding.name.text);
      }
    }
  }
  if (!importedHooks.size && !reactNamespace) return false;

  let callsHook = false;
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression) && importedHooks.has(node.expression.text)) callsHook = true;
      if (reactNamespace && ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) && node.expression.expression.text === reactNamespace &&
        HOOK_NAMES.has(node.expression.name.text)) callsHook = true;
    }
    if (!callsHook) ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return callsHook;
}

export function applyRequiredClientDirectives<T extends { path: string; content: string }>(files: T[]): { files: T[]; changedPaths: string[] } {
  const changedPaths: string[] = [];
  const normalized = files.map((file) => {
    if (!needsClientDirective(file.path, file.content)) return file;
    changedPaths.push(file.path);
    return { ...file, content: `"use client";\n${file.content}` };
  });
  return { files: normalized, changedPaths };
}
