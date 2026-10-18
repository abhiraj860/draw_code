import type { Graph } from "./sceneToGraph";
import type { CodeFile, Mode, ModelInfo } from "./types";

export async function fetchModels(): Promise<{ models: ModelInfo[]; runner: string }> {
  const res = await fetch("/api/models");
  if (!res.ok) throw new Error(`Backend returned ${res.status}`);
  return res.json();
}

export type GenerateRequest = {
  model: string;
  mode: Mode;
  graph: Graph;
  image: string | null;
  notes: string;
  previous_files: CodeFile[];
};

/** Streams generated text, calling onDelta for each chunk. */
export async function generateCode(
  req: GenerateRequest,
  onDelta: (text: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok || !res.body) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.detail ?? `Backend returned ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as { t: "delta" | "error" | "done"; d?: string };
      if (event.t === "delta") onDelta(event.d ?? "");
      else if (event.t === "error") throw new Error(event.d);
    }
  }
}
