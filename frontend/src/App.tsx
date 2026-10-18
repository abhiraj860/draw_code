import { exportToBlob } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { DiagramPanel } from "./components/DiagramPanel";
import { EditorPanel } from "./components/EditorPanel";
import { TerminalPanel, type TerminalHandle } from "./components/TerminalPanel";
import { fetchModels, generateCode } from "./lib/api";
import { exampleElements } from "./lib/example";
import { parseFiles } from "./lib/parseFiles";
import { sceneToGraph, type SceneElement } from "./lib/sceneToGraph";
import { load, save } from "./lib/storage";
import { MODES, type CodeFile, type Mode, type ModelInfo, type Theme } from "./lib/types";

const STARTER: CodeFile[] = [
  {
    path: "main.py",
    content: `"""Draw a system design on the left, then press Ctrl+Enter to generate code.

Press Run (Ctrl+Shift+Enter) to execute main.py in the terminal below.
"""

print("Hello from draw_code!")
`,
  },
];

type Status = { kind: "info" | "error" | "busy"; text: string };

async function drawingAsPng(api: ExcalidrawImperativeAPI): Promise<string> {
  const blob = await exportToBlob({
    elements: api.getSceneElements(),
    appState: { ...api.getAppState(), exportBackground: true, viewBackgroundColor: "#ffffff", exportWithDarkMode: false },
    files: api.getFiles(),
    mimeType: "image/png",
    maxWidthOrHeight: 1600,
  });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => load("theme", "dark"));
  const [files, setFiles] = useState<CodeFile[]>(() => load("files", STARTER));
  const [activePath, setActivePath] = useState<string>(() => load("activePath", "main.py"));
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelId, setModelId] = useState<string>(() => load("model", ""));
  const [mode, setMode] = useState<Mode>(() => load("mode", "simulation"));
  const [notes, setNotes] = useState<string>(() => load("notes", ""));
  const [updateExisting, setUpdateExisting] = useState<boolean>(() => load("updateExisting", true));
  const [generating, setGenerating] = useState(false);
  const [running, setRunning] = useState(false);
  const [runner, setRunner] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "info", text: "Connecting to backend…" });

  const excalidraw = useRef<ExcalidrawImperativeAPI | null>(null);
  const terminal = useRef<TerminalHandle>(null);
  const abort = useRef<AbortController | null>(null);

  // Persist the session.
  useEffect(() => save("theme", theme), [theme]);
  useEffect(() => save("files", files), [files]);
  useEffect(() => save("activePath", activePath), [activePath]);
  useEffect(() => save("model", modelId), [modelId]);
  useEffect(() => save("mode", mode), [mode]);
  useEffect(() => save("notes", notes), [notes]);
  useEffect(() => save("updateExisting", updateExisting), [updateExisting]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const refreshModels = useCallback(async () => {
    try {
      const data = await fetchModels();
      setModels(data.models);
      setRunner(data.runner);
      setModelId((current) => (data.models.some((m) => m.id === current) ? current : (data.models[0]?.id ?? "")));
      setStatus(
        data.models.length
          ? { kind: "info", text: "Ready. Draw your design, then press Ctrl+Enter." }
          : { kind: "error", text: "No models available. Add an API key to .env (see .env.example) and restart the backend." },
      );
      return true;
    } catch {
      setStatus({ kind: "error", text: "Waiting for the backend on port 8000… (start it with ./dev.sh)" });
      return false;
    }
  }, []);

  // The backend can take a few seconds to start, so keep trying until it answers.
  useEffect(() => {
    let timer: number | undefined;
    const attempt = async () => {
      if (!(await refreshModels())) timer = window.setTimeout(attempt, 2000);
    };
    attempt();
    return () => window.clearTimeout(timer);
  }, [refreshModels]);

  const pristine = files.length === STARTER.length && files.every((f, i) => f.content === STARTER[i].content);

  const generate = useCallback(async () => {
    if (generating) {
      abort.current?.abort();
      return;
    }
    const api = excalidraw.current;
    if (!api) return;
    const model = models.find((m) => m.id === modelId);
    if (!model) {
      setStatus({ kind: "error", text: "Pick a model first. No model is available until you add an API key to .env." });
      return;
    }
    const graph = sceneToGraph(api.getSceneElements() as readonly SceneElement[]);
    if (graph.nodes.length === 0) {
      setStatus({ kind: "error", text: "The canvas has no shapes yet. Draw some boxes and arrows, or click Example." });
      return;
    }

    const controller = new AbortController();
    abort.current = controller;
    setGenerating(true);
    setStatus({
      kind: "busy",
      text: `Generating with ${model.label}: ${graph.nodes.length} components, ${graph.edges.length} connections…`,
    });

    const before = files;
    let text = "";
    try {
      const image = model.vision ? await drawingAsPng(api) : null;
      await generateCode(
        {
          model: model.id,
          mode,
          graph,
          image,
          notes,
          previous_files: updateExisting && !pristine ? before : [],
        },
        (delta) => {
          text += delta;
          const parsed = parseFiles(text);
          if (parsed.length) {
            setFiles(parsed);
            setActivePath(parsed[parsed.length - 1].path);
          }
        },
        controller.signal,
      );
      const parsed = parseFiles(text);
      if (parsed.length === 0) {
        // The model ignored the format; show what it said rather than losing it.
        setFiles([...before.filter((f) => f.path !== "RESPONSE.md"), { path: "RESPONSE.md", content: text }]);
        setActivePath("RESPONSE.md");
        setStatus({ kind: "error", text: "The model did not return files in the expected format. Its reply is in RESPONSE.md." });
      } else {
        setActivePath(parsed.some((f) => f.path === "main.py") ? "main.py" : parsed[0].path);
        setStatus({ kind: "info", text: `Generated ${parsed.length} file${parsed.length > 1 ? "s" : ""}. Press Run to execute.` });
      }
    } catch (err) {
      if (controller.signal.aborted) {
        setStatus({ kind: "info", text: "Generation cancelled." });
      } else {
        setStatus({ kind: "error", text: err instanceof Error ? err.message : String(err) });
      }
    } finally {
      setGenerating(false);
      abort.current = null;
    }
  }, [generating, models, modelId, mode, notes, updateExisting, pristine, files]);

  const run = useCallback(() => {
    const entry = files.some((f) => f.path === "main.py") ? "main.py" : activePath;
    terminal.current?.run(files, entry);
  }, [files, activePath]);

  // Keyboard shortcuts. Capture phase so they work inside Excalidraw and Monaco.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || !(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) run();
      else generate();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [generate, run]);

  const loadExample = () => {
    const api = excalidraw.current;
    if (!api) return;
    if (api.getSceneElements().length && !confirm("Replace the current drawing with the example?")) return;
    const elements = exampleElements();
    api.updateScene({ elements });
    api.scrollToContent(elements, { fitToViewport: true, viewportZoomFactor: 0.8 });
  };

  const addFile = () => {
    const path = prompt("New file name", "utils.py")?.trim();
    if (!path) return;
    if (files.some((f) => f.path === path)) {
      setActivePath(path);
      return;
    }
    setFiles([...files, { path, content: "" }]);
    setActivePath(path);
  };

  const deleteFile = (path: string) => {
    if (!confirm(`Delete ${path}?`)) return;
    const rest = files.filter((f) => f.path !== path);
    setFiles(rest);
    if (activePath === path) setActivePath(rest[0]?.path ?? "");
  };

  const renameFile = (path: string) => {
    const next = prompt("Rename file", path)?.trim();
    if (!next || next === path || files.some((f) => f.path === next)) return;
    setFiles(files.map((f) => (f.path === path ? { ...f, path: next } : f)));
    if (activePath === path) setActivePath(next);
  };

  const modeInfo = MODES.find((m) => m.id === mode)!;
  const isMac = navigator.platform.toLowerCase().includes("mac");
  const mod = isMac ? "⌘" : "Ctrl";

  return (
    <div className="app">
      <header className="toolbar">
        <div className="brand">
          <span className="logo" aria-hidden>
            {"</>"}
          </span>
          draw_code
        </div>

        <label className="field">
          <span>Model</span>
          <select value={modelId} onChange={(e) => setModelId(e.target.value)} onFocus={refreshModels}>
            {models.length === 0 && <option value="">No models (add a key to .env)</option>}
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field" title={modeInfo.hint}>
          <span>Output</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            {MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field grow">
          <span>Notes</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional instructions, e.g. “use a token bucket rate limiter”"
          />
        </label>

        <label className="check" title="Send the current files so the model updates them instead of starting over">
          <input
            type="checkbox"
            checked={updateExisting}
            disabled={pristine}
            onChange={(e) => setUpdateExisting(e.target.checked)}
          />
          Update existing code
        </label>

        <button className={`btn primary ${generating ? "danger" : ""}`} onClick={generate}>
          {generating ? "Cancel" : "Generate"} <kbd>{mod}+Enter</kbd>
        </button>
      </header>

      <Group orientation="horizontal" className="workspace">
        <Panel defaultSize="55%" minSize="20%">
          <div className="pane">
            <div className="pane-header">
              <span>Diagram</span>
              <button className="btn small" onClick={loadExample}>
                Example
              </button>
            </div>
            <DiagramPanel theme={theme} onReady={(api) => (excalidraw.current = api)} />
          </div>
        </Panel>
        <Separator className="resizer vertical" />
        <Panel defaultSize="45%" minSize="20%">
          <Group orientation="vertical">
            <Panel defaultSize="62%" minSize="15%">
              <div className="pane">
                <EditorPanel
                  files={files}
                  activePath={activePath}
                  theme={theme}
                  generating={generating}
                  onSelect={setActivePath}
                  onChange={(path, content) => setFiles((fs) => fs.map((f) => (f.path === path ? { ...f, content } : f)))}
                  onAdd={addFile}
                  onDelete={deleteFile}
                  onRename={renameFile}
                />
              </div>
            </Panel>
            <Separator className="resizer horizontal" />
            <Panel defaultSize="38%" minSize="10%">
              <div className="pane">
                <div className="pane-header">
                  <span>Terminal</span>
                  <div className="actions">
                    <button className="btn small run" onClick={run} disabled={generating} title={`${mod}+Shift+Enter`}>
                      ▶ Run
                    </button>
                    <button className="btn small" onClick={() => terminal.current?.shell(files)} title="Open bash in the workspace">
                      Shell
                    </button>
                    <button className="btn small" onClick={() => terminal.current?.stop()} disabled={!running}>
                      ■ Stop
                    </button>
                    <button className="btn small" onClick={() => terminal.current?.clear()}>
                      Clear
                    </button>
                  </div>
                </div>
                <TerminalPanel ref={terminal} theme={theme} onRunningChange={setRunning} />
              </div>
            </Panel>
          </Group>
        </Panel>
      </Group>

      <footer className={`statusbar ${status.kind}`}>
        <span className="status-text" role="status">
          {status.kind === "busy" && <span className="spinner" aria-hidden />}
          {status.text}
        </span>
        <span className="status-meta">
          {runner && <span title="Where code runs. Set RUNNER=docker in .env to sandbox it.">runner: {runner}</span>}
          <button className="btn small ghost" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? "☀ Light" : "☾ Dark"}
          </button>
        </span>
      </footer>
    </div>
  );
}
