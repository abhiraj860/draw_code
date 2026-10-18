import type { CodeFile } from "./types";

const HEADER = /^=== FILE: (.+?) ===[ \t]*$/gm;
const END = "=== END FILE ===";

/**
 * Parses the model's "=== FILE: path ===" blocks. Works on partial text while
 * the response is still streaming, so files fill in live.
 */
export function parseFiles(text: string): CodeFile[] {
  const headers = [...text.matchAll(HEADER)];
  if (headers.length === 0) return fromCodeFence(text);
  return headers.map((m, i) => {
    const start = m.index! + m[0].length;
    const stop = i + 1 < headers.length ? headers[i + 1].index! : text.length;
    let body = text.slice(start, stop);

    const end = body.indexOf(END);
    if (end >= 0) {
      body = body.slice(0, end);
    } else {
      // Still streaming: drop a half-received end marker on the last line.
      const lastLine = body.slice(body.lastIndexOf("\n") + 1);
      if (lastLine && END.startsWith(lastLine)) body = body.slice(0, body.length - lastLine.length);
    }

    let lines = body.replace(/\r\n/g, "\n").split("\n");
    if (lines[0] === "") lines = lines.slice(1);
    // Some models wrap files in markdown fences despite instructions.
    if (lines[0]?.startsWith("```")) lines = lines.slice(1);
    while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
    if (lines[lines.length - 1]?.trim() === "```") lines.pop();

    return { path: m[1].trim(), content: lines.join("\n") + "\n" };
  });
}

/**
 * Fallback for models (often small local ones) that ignore the file format and
 * answer with markdown: use the largest Python code block as main.py.
 */
function fromCodeFence(text: string): CodeFile[] {
  const blocks = [...text.matchAll(/```(?:python|py)[ \t]*\n([\s\S]*?)(?:\n```|$)/g)].map((m) => m[1]);
  const largest = blocks.reduce((a, b) => (b.length > a.length ? b : a), "");
  return largest.trim() ? [{ path: "main.py", content: largest.trimEnd() + "\n" }] : [];
}
