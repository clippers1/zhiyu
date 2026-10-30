import React from "react";
import rough from "roughjs/bundled/rough.esm.js";

// Hand-drawn figure primitives shared by every diagram. rough.js gives the
// strokes their marker quality; a fixed seed per shape keeps a figure
// identical across renders and screenshot tests.
//
// Colours are CSS variables applied through `style` (presentation attributes
// cannot resolve var()), so figures follow the page tokens.
const generator = rough.generator();

export const INK = "var(--ink)";
export const INK_2 = "var(--ink-2)";
export const INK_3 = "var(--ink-3)";
export const ACCENT = "var(--accent)";
export const RULE = "var(--rule-strong)";
export const WASH = "var(--accent-wash)";
export const CLAY = "var(--clay)";
export const CLAY_WASH = "var(--clay-wash)";
export const SLATE = "var(--figure-slate)";
export const SLATE_WASH = "var(--figure-slate-wash)";

const STROKE = { roughness: 1, bowing: 1, strokeWidth: 1.8 };

function paths(drawable, key, dash) {
  return generator.toPaths(drawable).map((path, index) => (
    <path
      key={`${key}-${index}`}
      d={path.d}
      style={{
        stroke: path.stroke,
        strokeWidth: path.strokeWidth,
        fill: path.fill || "none",
        ...(dash ? { strokeDasharray: dash.join(" ") } : null),
      }}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ));
}

function roundedRectPath(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  return [
    `M${x + r} ${y}`,
    `H${x + width - r}`,
    `A${r} ${r} 0 0 1 ${x + width} ${y + r}`,
    `V${y + height - r}`,
    `A${r} ${r} 0 0 1 ${x + width - r} ${y + height}`,
    `H${x + r}`,
    `A${r} ${r} 0 0 1 ${x} ${y + height - r}`,
    `V${y + r}`,
    `A${r} ${r} 0 0 1 ${x + r} ${y}`,
    "Z",
  ].join(" ");
}

// A sticky-note card: hand-drawn rounded border over a flat wash.
export function SketchCard({ x, y, width, height, tone = WASH, stroke = ACCENT, seed = 1, radius = 14 }) {
  return paths(
    generator.path(roundedRectPath(x, y, width, height, radius), {
      ...STROKE,
      seed,
      stroke,
      strokeWidth: 2,
      fill: tone,
      fillStyle: "solid",
    }),
    `card-${seed}`,
  );
}

// A loose marker stroke used behind a figure headline.
export function SketchMarker({ x, y, width, height = 9, color = "var(--marker)", seed = 1 }) {
  return paths(
    generator.rectangle(x, y, width, height, {
      roughness: 1.4,
      bowing: 2,
      seed,
      stroke: "none",
      fill: color,
      fillStyle: "solid",
    }),
    `marker-${seed}`,
  );
}

function arrowHead(x1, y1, x2, y2, color, seed) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  return [0.42, -0.42].map((spread, index) => {
    const a = angle + Math.PI + spread;
    const size = 11;
    return paths(
      generator.line(x2, y2, x2 + Math.cos(a) * size, y2 + Math.sin(a) * size, {
        roughness: 1.1,
        seed: seed + index,
        stroke: color,
        strokeWidth: 2.2,
      }),
      `head-${seed}-${index}`,
    );
  });
}

export function SketchArrow({ from, to, color = ACCENT, seed = 1 }) {
  return (
    <>
      {paths(generator.line(from[0], from[1], to[0], to[1], { ...STROKE, seed, stroke: color, strokeWidth: 2.2 }), `arrow-${seed}`)}
      {arrowHead(from[0], from[1], to[0], to[1], color, seed + 10)}
    </>
  );
}

// Curved arrow; `bow` lifts the middle of the line above the two endpoints.
export function SketchCurve({ from, to, bow = 30, color = ACCENT, seed = 1 }) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2 - bow;
  return (
    <>
      {paths(generator.curve([[x1, y1], [cx, cy], [x2, y2]], { ...STROKE, seed, stroke: color, strokeWidth: 2.2 }), `curve-${seed}`)}
      {arrowHead(cx, cy, x2, y2, color, seed + 20)}
    </>
  );
}

// Dashed feedback line: same hand, clearly secondary to the main path.
export function SketchDashed({ from, to, bow = 40, color = INK_3, seed = 1 }) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2 - bow;
  return (
    <>
      {paths(
        generator.curve([[x1, y1], [cx, cy], [x2, y2]], { ...STROKE, seed, stroke: color, strokeWidth: 1.6 }),
        `dash-${seed}`,
        [6, 7],
      )}
      {arrowHead(cx, cy, x2, y2, color, seed + 30)}
    </>
  );
}

export function SketchLine({ from, to, color = RULE, seed = 1, width = 1.6, dash }) {
  return paths(
    generator.line(from[0], from[1], to[0], to[1], { ...STROKE, seed, stroke: color, strokeWidth: width }),
    `line-${seed}`,
    dash,
  );
}

export function SketchDot({ cx, cy, r = 5, color = ACCENT }) {
  return <circle cx={cx} cy={cy} r={r} fill={color} />;
}

// Flat wash block (bars, ranges, highlights) with a faint hand edge.
export function SketchBar({ x, y, width, height, color = WASH, seed = 1, radius = 4 }) {
  return paths(
    generator.path(roundedRectPath(x, y, width, height, radius), {
      roughness: 0.8,
      bowing: 0.5,
      seed,
      stroke: "none",
      fill: color,
      fillStyle: "solid",
    }),
    `bar-${seed}`,
  );
}

// Free-form hand-drawn path, for curves that are not a simple arrow (pulse
// traces, brackets, callout strokes).
export function SketchPath({ d, color = ACCENT, seed = 1, width = 2.2, fill = "none", dash }) {
  return paths(
    generator.path(d, { ...STROKE, seed, stroke: color, strokeWidth: width, fill, fillStyle: "solid" }),
    `path-${seed}`,
    dash,
  );
}
