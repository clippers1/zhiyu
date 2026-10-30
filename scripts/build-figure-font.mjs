import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import subsetFont from "subset-font";

// Figures use a display face for headlines. Shipping the full 2.6 MB CJK font
// would be wasteful, so this script subsets it to the characters the diagrams
// actually draw. Run it after editing figure copy: npm run fonts:build
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const source = path.join(root, "assets/fonts/SmileySans-Oblique.ttf");
const target = path.join(root, "public/fonts/smiley-sans.woff2");

const diagrams = await readFile(path.join(root, "src/components/Diagrams.jsx"), "utf8");
// Only the text that reaches the canvas: node text, titles and descriptions.
// Code identifiers and comments are not glyph sources and would bloat the file.
const labelText = [
  ...[...diagrams.matchAll(/>([^<>{}]+)</g)].map(match => match[1]),
  ...[...diagrams.matchAll(/(?:title|description)="([^"]*)"/g)].map(match => match[1]),
  ...[...diagrams.matchAll(/(?:label|text):\s*"([^"]*)"/g)].map(match => match[1]),
].join("");
const characters = [...new Set(labelText.replace(/\s/g, ""))].sort().join("");
const font = await readFile(source);
const subset = await subsetFont(font, characters, { targetFormat: "woff2" });
await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, subset);
console.log(`Subset ${characters.length} characters into ${path.relative(root, target)} (${(subset.length / 1024).toFixed(1)} KB).`);
