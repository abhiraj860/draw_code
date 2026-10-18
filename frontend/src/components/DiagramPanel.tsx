import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useMemo, useRef } from "react";
import { allIconFiles } from "../lib/insert";
import { load, save } from "../lib/storage";
import { DRAG_MIME } from "./Palette";

type Props = {
  theme: "light" | "dark";
  onReady: (api: ExcalidrawImperativeAPI) => void;
  onDropComponent: (componentId: string, client: { clientX: number; clientY: number }) => void;
};

export function DiagramPanel({ theme, onReady, onDropComponent }: Props) {
  const initialData = useMemo(
    () => ({ elements: load("scene", []), files: allIconFiles(), scrollToContent: true }),
    [],
  );
  const saveTimer = useRef<number | undefined>(undefined);

  return (
    <div
      className="diagram"
      // Capture phase, so palette drops are handled here instead of by Excalidraw.
      onDragOverCapture={(e) => {
        if (e.dataTransfer.types.includes(DRAG_MIME)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }
      }}
      onDropCapture={(e) => {
        const id = e.dataTransfer.getData(DRAG_MIME);
        if (!id) return;
        e.preventDefault();
        e.stopPropagation();
        onDropComponent(id, { clientX: e.clientX, clientY: e.clientY });
      }}
    >
      <Excalidraw
        initialData={initialData}
        theme={theme}
        excalidrawAPI={onReady}
        UIOptions={{ canvasActions: { toggleTheme: false } }}
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
