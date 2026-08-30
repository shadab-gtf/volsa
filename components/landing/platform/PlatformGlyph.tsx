import React, { type ReactNode } from "react";

/**
 * Isometric wireframe marks for the platform components.
 *
 * `cubeFaces` places a unit cube's three visible faces on an isometric grid, so a
 * cluster, a row or a stack is just a loop over grid coordinates rather than
 * hand-authored path data — the same "generate, don't hand-tune" rule the previous,
 * lighter mark set (a parametric globe, venn, rotor…) already followed, now built
 * around one heavier, more illustrative primitive.
 *
 * Every composition below is described in raw isometric-grid units of whatever scale
 * reads best for it; `render` then measures the composition's own bounding box and
 * fits it to the shared 0–100 viewBox, so nothing has to be hand-centred or re-tuned
 * when a composition changes shape.
 */

type Pt = [number, number];

const COS30 = Math.sqrt(3) / 2;
const SIN30 = 0.5;

/** Isometric projection of one grid point — (0,0,0) is the shared world origin. */
function isoRaw(gx: number, gy: number, gz: number): Pt {
  return [(gx - gy) * COS30, (gx + gy) * SIN30 - gz];
}

/** A unit cube's three visible faces (top, right, front), edge length `size`. */
function cubeFaces(gx: number, gy: number, gz: number, size: number): Pt[][] {
  const p = (dx: number, dy: number, dz: number) =>
    isoRaw(gx + dx * size, gy + dy * size, gz + dz * size);
  return [
    [p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1)], // top
    [p(1, 0, 0), p(1, 1, 0), p(1, 1, 1), p(1, 0, 1)], // right
    [p(0, 1, 0), p(1, 1, 0), p(1, 1, 1), p(0, 1, 1)], // front
  ];
}

/** Top-centre point of a cube — where a wire, a light or a ring attaches. */
function cubeTop(gx: number, gy: number, gz: number, size: number): Pt {
  return isoRaw(gx + size / 2, gy + size / 2, gz + size);
}

type Prim =
  | { kind: "polygon"; points: Pt[] }
  | { kind: "line"; a: Pt; b: Pt }
  | { kind: "dot"; c: Pt; r: number }
  | { kind: "ring"; c: Pt; rx: number; ry: number; rotate: number };

const cube = (gx: number, gy: number, gz: number, size: number): Prim[] =>
  cubeFaces(gx, gy, gz, size).map((points) => ({ kind: "polygon", points }));

const line = (a: Pt, b: Pt): Prim => ({ kind: "line", a, b });
const dot = (c: Pt, r: number): Prim => ({ kind: "dot", c, r });
const ring = (c: Pt, rx: number, ry: number, rotate: number): Prim => ({
  kind: "ring",
  c,
  rx,
  ry,
  rotate,
});

/** Every point a primitive touches, for the bounding-box fit below. */
function extent(prim: Prim): Pt[] {
  switch (prim.kind) {
    case "polygon":
      return prim.points;
    case "line":
      return [prim.a, prim.b];
    case "dot":
      return [
        [prim.c[0] - prim.r, prim.c[1] - prim.r],
        [prim.c[0] + prim.r, prim.c[1] + prim.r],
      ];
    case "ring": {
      const r = Math.max(prim.rx, prim.ry);
      return [
        [prim.c[0] - r, prim.c[1] - r],
        [prim.c[0] + r, prim.c[1] + r],
      ];
    }
  }
}

/** Fits a composition to the shared 0–100 viewBox, centred, with a fixed margin. */
function render(prims: Prim[], keyPrefix: string, pad = 13): ReactNode[] {
  const points = prims.flatMap(extent);
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = Math.max(maxX - minX, 0.001);
  const h = Math.max(maxY - minY, 0.001);
  const scale = Math.min((100 - pad * 2) / w, (100 - pad * 2) / h);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const map = ([x, y]: Pt): Pt => [50 + (x - cx) * scale, 50 + (y - cy) * scale];

  return prims.map((prim, i) => {
    const key = `${keyPrefix}${i}`;

    if (prim.kind === "polygon") {
      const p = prim.points
        .map(map)
        .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
        .join(" ");
      return <polygon key={key} points={p} pathLength={1} />;
    }

    if (prim.kind === "line") {
      const [x1, y1] = map(prim.a);
      const [x2, y2] = map(prim.b);
      return <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} pathLength={1} />;
    }

    if (prim.kind === "dot") {
      const [dx, dy] = map(prim.c);
      return <circle key={key} cx={dx} cy={dy} r={prim.r * scale} fill="currentColor" stroke="none" />;
    }

    const [rx0, ry0] = map(prim.c);
    return (
      <ellipse
        key={key}
        cx={rx0}
        cy={ry0}
        rx={prim.rx * scale}
        ry={prim.ry * scale}
        transform={`rotate(${prim.rotate} ${rx0} ${ry0})`}
        pathLength={1}
      />
    );
  });
}

/** intelligence — three agents wired into one decision layer. */
function cluster(): ReactNode[] {
  const centre = { gx: -0.65, gy: -0.65, gz: 0, size: 1.3 };
  const sats = [
    { gx: -2.75, gy: -0.95, gz: 0, size: 0.62 },
    { gx: 1.05, gy: -2.2, gz: 0, size: 0.62 },
    { gx: 0.4, gy: 1.15, gz: 0, size: 0.62 },
  ];
  const centreTop = cubeTop(centre.gx, centre.gy, centre.gz, centre.size);
  const prims: Prim[] = [
    ...cube(centre.gx, centre.gy, centre.gz, centre.size),
    ...sats.flatMap((s) => cube(s.gx, s.gy, s.gz, s.size)),
    ...sats.map((s) => line(cubeTop(s.gx, s.gy, s.gz, s.size), centreTop)),
  ];
  return render(prims, "cluster");
}

/** wallets — three separate boxes, one per chain. */
function walletRow(): ReactNode[] {
  const size = 1;
  const xs = [-2.05, -0.6, 0.85];
  const prims: Prim[] = xs.flatMap((gx) => cube(gx, 0, 0, size));
  return render(prims, "wallets");
}

/** engine — one block, one ring: a machine that turns. */
function turningBlock(): ReactNode[] {
  const c = { gx: -0.8, gy: -0.8, gz: 0, size: 1.6 };
  const top = cubeTop(c.gx, c.gy, c.gz, c.size);
  const prims: Prim[] = [...cube(c.gx, c.gy, c.gz, c.size), ring(top, 2.15, 0.85, -30)];
  return render(prims, "engine");
}

/** swap — two boxes trading places along a single arc. */
function exchangeArc(): ReactNode[] {
  const left = { gx: -1.95, gy: 0, gz: 0, size: 1 };
  const right = { gx: 0.95, gy: 0, gz: 0, size: 1 };
  const lt = cubeTop(left.gx, left.gy, left.gz, left.size);
  const rt = cubeTop(right.gx, right.gy, right.gz, right.size);
  const mid: Pt = [(lt[0] + rt[0]) / 2, Math.min(lt[1], rt[1]) - 1.15];
  const prims: Prim[] = [
    ...cube(left.gx, left.gy, left.gz, left.size),
    ...cube(right.gx, right.gy, right.gz, right.size),
    line(lt, mid),
    line(mid, rt),
    line([rt[0] - 0.55, rt[1] - 0.65], rt),
    line([rt[0] - 0.05, rt[1] - 1.05], rt),
    line([lt[0] + 0.55, lt[1] - 0.65], lt),
    line([lt[0] + 0.05, lt[1] - 1.05], lt),
  ];
  return render(prims, "swap");
}

/** portfolio — holdings, stacked higher column by column. */
function ascendingStacks(): ReactNode[] {
  const size = 1;
  const cols = [
    { gx: -2.15, height: 1 },
    { gx: -0.65, height: 2 },
    { gx: 0.85, height: 3 },
  ];
  const prims: Prim[] = cols.flatMap(({ gx, height }) =>
    Array.from({ length: height }, (_, i) => cube(gx, 0, i, size)).flat()
  );
  return render(prims, "portfolio");
}

/** alerts — a box with a light going off. */
function pingBlock(): ReactNode[] {
  const c = { gx: -0.7, gy: -0.7, gz: 0, size: 1.4 };
  const top = cubeTop(c.gx, c.gy, c.gz, c.size);
  const burst = [-70, -113, -156].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    const inner: Pt = [top[0] + Math.cos(rad) * 0.55, top[1] + Math.sin(rad) * 0.55];
    const outer: Pt = [top[0] + Math.cos(rad) * 1.25, top[1] + Math.sin(rad) * 1.25];
    return line(inner, outer);
  });
  const prims: Prim[] = [...cube(c.gx, c.gy, c.gz, c.size), dot(top, 0.26), ...burst];
  return render(prims, "alerts");
}

const GLYPHS: Record<string, ReactNode[]> = {
  intelligence: cluster(),
  wallets: walletRow(),
  engine: turningBlock(),
  swap: exchangeArc(),
  portfolio: ascendingStacks(),
  alerts: pingBlock(),
};

interface PlatformGlyphProps {
  id: string;
  className?: string;
}

export function PlatformGlyph({ id, className = "h-16 w-16" }: PlatformGlyphProps) {
  const glyph = GLYPHS[id];
  if (!glyph) return null;

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`platform-glyph ${className}`}
      aria-hidden
      focusable="false"
    >
      {glyph}
    </svg>
  );
}
