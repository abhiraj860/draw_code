# draw_code

A system design canvas built on [Excalidraw](https://github.com/excalidraw/excalidraw). Pick ready-made components from the sidebar (load balancers, databases, caches, queues, services, boundaries and more), place them on the canvas, and connect them with arrows.

## Run it

Needs Node 20+.

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

`npm run build` makes a static site in `frontend/dist/` that you can host anywhere.

## Using it

- **Add a component:** click it in the sidebar to place it in the middle of the view, or drag it onto the canvas. Use the search box to find one by name or by technology (e.g. "redis", "kafka", "s3").
- **Connect components:** press `A` (or pick the arrow tool) and drag from one component to another. Double-click an arrow to label it ("HTTPS", "publish", ...).
- **Rename:** double-click a component to select it, then double-click again to edit its text.
- **Boundaries** (Region, VPC, Availability Zone, Subnet, Group) are dashed boxes placed behind everything, to frame related components. **Note** adds a sticky note for requirements.
- **Sketchy / Clean** at the bottom of the sidebar sets the look of new components: hand-drawn, or straight lines with a plain font.
- **Load example** draws a sample design. Everything else (export to PNG/SVG, undo, colors, library) is standard Excalidraw.

Your drawing is saved in the browser automatically.

## Adding components

All components are defined in [frontend/src/lib/components.ts](frontend/src/lib/components.ts). To add one, add an entry to a category:

```ts
node("api-gateway", "API Gateway", Router, "gateway kong apigee edge"),
//    id             label          icon    extra search words
```

Icons come from [Lucide](https://lucide.dev/icons/); import the icon by name from `lucide-static`. Each category sets the colors for its components.

Every component carries `customData: { component, category }` on its Excalidraw elements, so a later step (such as generating code from the diagram) can tell exactly what each box is.

## Project layout

```
frontend/src/
  App.tsx                    top bar, palette, canvas
  components/Palette.tsx     searchable, collapsible component sidebar
  components/DiagramPanel.tsx  Excalidraw canvas, drag-and-drop, autosave
  lib/components.ts          the component catalog
  lib/insert.ts              builds components as Excalidraw elements
  lib/example.ts             the sample design
```
