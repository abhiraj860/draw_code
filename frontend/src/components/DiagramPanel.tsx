import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useMemo, useRef } from "react";
import { load, save } from "../lib/storage";
import type { Theme } from "../lib/types";

type Props = {
  theme: Theme;
  onReady: (api: ExcalidrawImperativeAPI) => void;
};

export function DiagramPanel({ theme, onReady }: Props) {
  const initialData = useMemo(() => ({ elements: load("scene", []), scrollToContent: true }), []);
  const saveTimer = useRef<number | undefined>(undefined);

  return (
    <div className="diagram">
      <Excalidraw
        initialData={initialData}
        theme={theme}
        excalidrawAPI={onReady}
        UIOptions={{ canvasActions: { toggleTheme: false, saveToActiveFile: false } }}
        onChange={(elements) => {
          window.clearTimeout(saveTimer.current);
          saveTimer.current = window.setTimeout(
            () => save("scene", elements.filter((e) => !e.isDeleted)),
            400,
          );
        }}
      />
    </div>
  );
}
