import Editor from "@monaco-editor/react";
import type { CodeFile, Theme } from "../lib/types";

const LANGUAGES: Record<string, string> = {
  py: "python",
  md: "markdown",
  json: "json",
  yml: "yaml",
  yaml: "yaml",
  toml: "ini",
  ini: "ini",
  cfg: "ini",
  sh: "shell",
  txt: "plaintext",
  html: "html",
  sql: "sql",
};

function languageOf(path: string): string {
  const name = path.split("/").pop() ?? "";
  if (name === "Dockerfile") return "dockerfile";
  return LANGUAGES[name.split(".").pop()?.toLowerCase() ?? ""] ?? "plaintext";
}

type Props = {
  files: CodeFile[];
  activePath: string;
  theme: Theme;
  generating: boolean;
  onSelect: (path: string) => void;
  onChange: (path: string, content: string) => void;
  onAdd: () => void;
  onDelete: (path: string) => void;
  onRename: (path: string) => void;
};

export function EditorPanel({ files, activePath, theme, generating, onSelect, onChange, onAdd, onDelete, onRename }: Props) {
  const active = files.find((f) => f.path === activePath) ?? files[0];

  return (
    <div className="editor">
      <div className="tabs" role="tablist">
        {files.map((f) => (
          <div
            key={f.path}
            role="tab"
            aria-selected={f.path === active?.path}
            className={`tab ${f.path === active?.path ? "active" : ""}`}
            onClick={() => onSelect(f.path)}
            onDoubleClick={() => onRename(f.path)}
            title={`${f.path} (double-click to rename)`}
          >
            <span>{f.path}</span>
            <button
              className="tab-close"
              aria-label={`Delete ${f.path}`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(f.path);
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button className="tab-add" onClick={onAdd} aria-label="New file" title="New file">
          +
        </button>
        {generating && <span className="tabs-status">writing code…</span>}
      </div>
      <div className="editor-body">
        {active ? (
          <Editor
            path={active.path}
            language={languageOf(active.path)}
            value={active.content}
            theme={theme === "dark" ? "vs-dark" : "light"}
            onChange={(value) => onChange(active.path, value ?? "")}
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              readOnly: generating,
              padding: { top: 8 },
            }}
          />
        ) : (
          <div className="empty">No files. Draw a design and press Ctrl+Enter.</div>
        )}
      </div>
    </div>
  );
}
