/**
 * Mirrors MCP call_tool dispatch in src/index.ts:
 *   if (!params.name || !tools[params.name]) { Tool not found }
 *
 * `tools` is a plain object, so inherited Object keys (constructor,
 * toString, valueOf, hasOwnProperty, __proto__) are truthy and pass
 * the existence check. list_tools uses Object.values (own keys only),
 * so clients never see those names, but call_tool still accepts them
 * and then throws Unknown tool as -32603 instead of -32601.
 *
 * Open PRs #3/#17/#38 lock missing/unknown methods and missing params.
 * They do not lock inherited Object property names as tool names.
 */

export const INHERITED_OBJECT_TOOL_NAMES = [
  'constructor',
  'toString',
  'valueOf',
  'hasOwnProperty',
  '__proto__',
] as const;

export function productionTreatsNameAsRegisteredTool(
  tools: Record<string, unknown>,
  name: string
): boolean {
  return Boolean(name && tools[name]);
}

export function isOwnRegisteredTool(
  tools: Record<string, unknown>,
  name: string
): boolean {
  return Boolean(name) && Object.prototype.hasOwnProperty.call(tools, name);
}

export function productionUsesHasOwnForToolLookup(source: string): boolean {
  return (
    source.includes('Object.hasOwn(tools') ||
    source.includes("tools.hasOwnProperty") ||
    source.includes('Object.prototype.hasOwnProperty.call(tools')
  );
}
