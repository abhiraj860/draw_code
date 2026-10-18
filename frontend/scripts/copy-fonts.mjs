// Serve Excalidraw's fonts from this app instead of a CDN, so text always
// renders in the right font, including offline. Runs before dev and build.
import { cpSync, existsSync } from "node:fs";

const from = "node_modules/@excalidraw/excalidraw/dist/prod/fonts";
const to = "public/fonts";
if (!existsSync(to)) cpSync(from, to, { recursive: true });
