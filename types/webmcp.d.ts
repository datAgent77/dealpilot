// Minimal ambient types for the emerging WebMCP API (document.modelContext).
// Spec: https://github.com/webmachinelearning/webmcp
export {};

interface WebMCPToolResult {
  content: Array<{ type: "text"; text: string }>;
}

interface WebMCPToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (
    args: Record<string, any>,
    ctx?: { signal?: AbortSignal },
  ) => Promise<WebMCPToolResult> | WebMCPToolResult;
}

interface WebMCPRegistrationOptions {
  signal?: AbortSignal;
  exposedTo?: string[];
}

interface WebMCPModelContext {
  registerTool(
    def: WebMCPToolDefinition,
    options?: WebMCPRegistrationOptions,
  ): Promise<void> | void;
  getTools?(): Promise<unknown[]>;
  addEventListener?(type: "toolchange", cb: () => void): void;
}

declare global {
  interface Document {
    modelContext?: WebMCPModelContext;
  }
}
