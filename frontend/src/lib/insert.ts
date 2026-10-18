import { CaptureUpdateAction, convertToExcalidrawElements, FONT_FAMILY, viewportCoordsToSceneCoords } from "@excalidraw/excalidraw";
import type { BinaryFileData, BinaryFiles, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { CATEGORIES, COMPONENTS, type Category, type ComponentDef } from "./components";

export type DrawStyle = "sketch" | "clean";

type Skeleton = Parameters<typeof convertToExcalidrawElements>[0] extends (infer T)[] | null ? T : never;
type Point = { x: number; y: number };

export const NODE = { w: 180, h: 100, icon: 36 };
const BOUNDARY = { w: 460, h: 300 };
const NOTE = { w: 220, h: 110 };

const randomId = () => Math.random().toString(36).slice(2, 12);

const styleProps = (style: DrawStyle) => ({
  roughness: style === "sketch" ? 1 : 0,
  fontFamily: style === "sketch" ? FONT_FAMILY.Excalifont : FONT_FAMILY.Nunito,
});

/**
 * Excalidraw sizes text when an element is created, so the font must already be
 * loaded or labels get measured with a fallback font and end up clipped.
 */
export async function ensureFonts(): Promise<void> {
  await Promise.all(["16px Excalifont", "16px Nunito"].map((font) => document.fonts.load(font).catch(() => [])));
}

// -- icons as Excalidraw image files ------------------------------------------

const fileId = (def: ComponentDef) => `drawcode-icon-${def.id}`;

function iconFile(def: ComponentDef, category: Category): BinaryFileData {
  const svg = def.icon
    .replace(/stroke="currentColor"/, `stroke="${category.stroke}"`)
    .replace(/width="24"/, 'width="96"')
    .replace(/height="24"/, 'height="96"');
  return {
    id: fileId(def) as BinaryFileData["id"],
    dataURL: `data:image/svg+xml;base64,${btoa(svg)}` as BinaryFileData["dataURL"],
    mimeType: "image/svg+xml",
    created: 0,
  };
}

/** Every icon file. Ids are stable, so saved drawings find their icons again. */
export function allIconFiles(): BinaryFiles {
  const files: BinaryFiles = {};
  for (const category of CATEGORIES) {
    for (const def of category.items) {
      if (def.kind === "node") files[fileId(def)] = iconFile(def, category);
    }
  }
  return files;
}

// -- shapes ---------------------------------------------------------------------

/**
 * Builds the skeleton elements for one component centered on `at`. A node is a
 * colored rounded box with its icon on top and its name below, grouped so it
 * moves as one. Double-click the box to rename it.
 */
export function componentSkeleton(
  componentId: string,
  at: Point,
  style: DrawStyle,
  opts: { id?: string; label?: string; size?: { w: number; h: number } } = {},
): { skeleton: Skeleton[]; shapeId: string } {
  const entry = COMPONENTS.get(componentId);
  if (!entry) throw new Error(`Unknown component ${componentId}`);
  const { def, category } = entry;
  const { roughness, fontFamily } = styleProps(style);
  const shapeId = opts.id ?? randomId();
  const label = opts.label ?? def.label;
  const customData = { component: def.id, category: category.id };

  if (def.kind === "boundary") {
    const { w, h } = opts.size ?? BOUNDARY;
    return {
      shapeId,
      skeleton: [
        {
          type: "rectangle",
          id: shapeId,
          x: at.x - w / 2,
          y: at.y - h / 2,
          width: w,
          height: h,
          strokeColor: category.stroke,
          backgroundColor: "transparent",
          strokeStyle: "dashed",
          strokeWidth: 2,
          roughness,
          roundness: { type: 3 },
          customData,
          label: { text: label, fontSize: 20, fontFamily, textAlign: "left", verticalAlign: "top", strokeColor: category.stroke },
        },
      ],
    };
  }

  if (def.kind === "note") {
    return {
      shapeId,
      skeleton: [
        {
          type: "rectangle",
          id: shapeId,
          x: at.x - NOTE.w / 2,
          y: at.y - NOTE.h / 2,
          width: NOTE.w,
          height: NOTE.h,
          strokeColor: "#f08c00",
          backgroundColor: "#fff3bf",
          fillStyle: "solid",
          strokeWidth: 1,
          roughness,
          roundness: null,
          customData,
          label: {
            text: opts.label ?? "Note: double-click to edit",
            fontSize: 16,
            fontFamily,
            textAlign: "left",
            verticalAlign: "top",
          },
        },
      ],
    };
  }

  const groupId = randomId();
  return {
    shapeId,
    skeleton: [
      {
        type: "rectangle",
        id: shapeId,
        x: at.x - NODE.w / 2,
        y: at.y - NODE.h / 2,
        width: NODE.w,
        height: NODE.h,
        strokeColor: category.stroke,
        backgroundColor: category.fill,
        fillStyle: "solid",
        strokeWidth: 2,
        roughness,
        roundness: { type: 3 },
        groupIds: [groupId],
        customData,
        label: { text: label, fontSize: 16, fontFamily, verticalAlign: "bottom", groupIds: [groupId] },
      },
      {
        type: "image",
        x: at.x - NODE.icon / 2,
        y: at.y - NODE.h / 2 + 14,
        width: NODE.icon,
        height: NODE.icon,
        fileId: fileId(def) as BinaryFileData["id"],
        status: "saved",
        groupIds: [groupId],
        customData,
      },
    ],
  };
}

/** An arrow from one component box to another, bound at both ends. */
export function arrowSkeleton(
  from: { id: string; at: Point },
  to: { id: string; at: Point },
  style: DrawStyle,
  label?: string,
): Skeleton {
  const { roughness, fontFamily } = styleProps(style);
  return {
    type: "arrow",
    x: from.at.x,
    y: from.at.y,
    width: to.at.x - from.at.x,
    height: to.at.y - from.at.y,
    start: { id: from.id },
    end: { id: to.id },
    roughness,
    ...(label ? { label: { text: label, fontSize: 14, fontFamily } } : {}),
  } as Skeleton;
}

// -- inserting into the live canvas -------------------------------------------------

let lastDrop: { x: number; y: number; count: number } | null = null;

/**
 * Adds a component to the canvas and selects it. Without a position it goes in
 * the middle of the view, nudged so repeated clicks do not stack exactly.
 */
export async function insertComponent(
  api: ExcalidrawImperativeAPI,
  componentId: string,
  style: DrawStyle,
  client?: { clientX: number; clientY: number },
) {
  await ensureFonts();
  const appState = api.getAppState();
  let at: Point;
  if (client) {
    at = viewportCoordsToSceneCoords(client, appState);
    lastDrop = null;
  } else {
    at = viewportCoordsToSceneCoords(
      { clientX: appState.offsetLeft + appState.width / 2, clientY: appState.offsetTop + appState.height / 2 },
      appState,
    );
    if (lastDrop && Math.abs(lastDrop.x - at.x) < 1 && Math.abs(lastDrop.y - at.y) < 1) {
      lastDrop.count += 1;
    } else {
      lastDrop = { x: at.x, y: at.y, count: 0 };
    }
    at = { x: at.x + lastDrop.count * 30, y: at.y + lastDrop.count * 30 };
  }

  const { skeleton } = componentSkeleton(componentId, at, style);
  const created = convertToExcalidrawElements(skeleton, { regenerateIds: false });
  const isBoundary = COMPONENTS.get(componentId)?.def.kind === "boundary";
  const existing = api.getSceneElementsIncludingDeleted();
  const groupId = created[0].groupIds[0];

  api.addFiles(Object.values(allIconFiles()));
  api.updateScene({
    // Boundaries go behind everything so they frame the components inside them.
    elements: isBoundary ? [...created, ...existing] : [...existing, ...created],
    appState: {
      selectedElementIds: Object.fromEntries(created.map((e) => [e.id, true as const])),
      selectedGroupIds: groupId ? { [groupId]: true } : {},
    },
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
  api.setActiveTool({ type: "selection" });
}
