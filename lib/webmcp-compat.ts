// WebMCP compatibility layer.
//
// The standard is still moving: Chrome's *deployed* implementation is runtime truth for the
// hackathon, but the living spec's IDL differs (e.g. executeTool takes an object, while Chrome
// today parses a JSON string). Every registerTool / getTools / executeTool call in the app goes
// through here, so if the API shifts in the final 48h we change ONE file, not N tools.

export type ToolDef = {
  name: string;
  description: string; // keep <= 500 chars
  inputSchema: Record<string, unknown>; // JSON Schema
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  // Return any serializable value; DealPilot returns a compact plain object.
  execute: (args: any, ctx?: { signal?: AbortSignal }) => unknown | Promise<unknown>;
};

export function hasWebMCP(): boolean {
  return typeof document !== "undefined" && !!document.modelContext;
}

// Robust registration: await + catch (an un-awaited rejection on the StrictMode-unmount abort
// throws "AbortError: signal is aborted without reason"), and guard the aborted signal.
export async function registerTool(def: ToolDef, signal: AbortSignal): Promise<boolean> {
  const mc = document.modelContext;
  if (!mc || signal.aborted) return false;
  try {
    await mc.registerTool(def as any, { signal });
  } catch {
    return false; // StrictMode remount / re-registration race — safe to ignore
  }
  return !signal.aborted;
}

export async function listTools(): Promise<Array<{ name: string }>> {
  const mc = document.modelContext as any;
  if (!mc?.getTools) return [];
  try {
    return await mc.getTools();
  } catch {
    return [];
  }
}

// Test-only invocation that absorbs the Chrome-vs-living-spec argument drift.
// Real agents (ChatGPT in-app browser) marshal arguments themselves from inputSchema.
export async function invokeToolForTest(
  name: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  const mc = document.modelContext as any;
  if (!mc?.getTools || !mc?.executeTool) {
    throw new Error("WebMCP getTools/executeTool unavailable in this environment");
  }
  const tools = await mc.getTools();
  const tool = tools.find((t: any) => t.name === name);
  if (!tool) throw new Error(`WebMCP tool not found: ${name}`);
  // Chrome deployed impl: JSON string. Living spec: plain object. Try string, fall back to object.
  try {
    return await mc.executeTool(tool, JSON.stringify(args));
  } catch {
    return await mc.executeTool(tool, args);
  }
}
