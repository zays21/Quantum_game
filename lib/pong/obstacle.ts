import { Ball, BALL_SIZE, BALL_MASS } from "./ball";
import { HBAR, G_MIN, G_MAX } from "./quantumConstant";

// An obstacle is a convex polygon defined by its vertices
export interface Obstacle {
  vertices: { x: number; y: number }[];
  barrierStrength: number; // g - strength of the delta barrier
  transmission: number; // computed on contact: T = transmission coefficient
  transmitted: boolean; // true if the ball tunneled through this obstacle
}

const MIN_WIDTH = 6;
const MAX_WIDTH = 16;
const MIN_HEIGHT = 60;
const MAX_HEIGHT = 180;

// Keep obstacles away from paddles and edges
const MARGIN_X_RATIO = 0.15; // 15% from each side
const MARGIN_Y = 60; // away from top/bottom

function randomInRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function makeThinRect(cx: number, cy: number): Obstacle {
  const hw = randomInRange(MIN_WIDTH, MAX_WIDTH) / 2;
  const hh = randomInRange(MIN_HEIGHT, MAX_HEIGHT) / 2;
  // Random rotation: -60° to +60° (120° range centered on vertical)
  const angle = randomInRange(-Math.PI / 3, Math.PI / 3);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const corners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];
  return {
    vertices: corners.map(({ x, y }) => ({
      x: cx + x * cos - y * sin,
      y: cy + x * sin + y * cos,
    })),
    barrierStrength: randomInRange(G_MIN, G_MAX),
    transmission: 0,
    transmitted: false,
  };
}

export function generateObstacles(
  canvasWidth: number,
  canvasHeight: number,
): Obstacle[] {
  const minX = canvasWidth * MARGIN_X_RATIO;
  const midX = canvasWidth / 2;
  const maxX = canvasWidth * (1 - MARGIN_X_RATIO);
  const minY = MARGIN_Y;
  const maxY = canvasHeight - MARGIN_Y;

  // One obstacle on the left half, one on the right half
  const leftCx = randomInRange(minX, midX);
  const rightCx = randomInRange(midX, maxX);

  return [
    makeThinRect(leftCx, randomInRange(minY, maxY)),
    makeThinRect(rightCx, randomInRange(minY, maxY)),
  ];
}

export function drawObstacle(
  ctx: CanvasRenderingContext2D,
  obs: Obstacle,
  colorOverride?: { r: number; g: number; b: number },
) {
  const verts = obs.vertices;
  let r = 255, g = 255, b = 255;
  if (colorOverride) {
    r = colorOverride.r;
    g = colorOverride.g;
    b = colorOverride.b;
  } else if (obs.transmitted) {
    r = 0; g = 200; b = 255;
  }
  const fillColor = `rgba(${r}, ${g}, ${b}, 0.25)`;
  const strokeColor = `rgba(${r}, ${g}, ${b}, 0.6)`;
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(verts[0].x, verts[0].y);
  for (let i = 1; i < verts.length; i++) {
    ctx.lineTo(verts[i].x, verts[i].y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// Returns the outward normal for an edge, given the polygon center
function edgeOutwardNormal(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): { nx: number; ny: number } {
  let nx = -(by - ay);
  let ny = bx - ax;
  const len = Math.sqrt(nx * nx + ny * ny);
  if (len > 0) {
    nx /= len;
    ny /= len;
  }
  // Make sure normal points away from polygon center
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  if (nx * (mx - cx) + ny * (my - cy) < 0) {
    nx = -nx;
    ny = -ny;
  }
  return { nx, ny };
}

// Line segment intersection: returns t along first segment, or null
function segmentIntersectT(
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  p3x: number,
  p3y: number,
  p4x: number,
  p4y: number,
): number | null {
  const d1x = p2x - p1x,
    d1y = p2y - p1y;
  const d2x = p4x - p3x,
    d2y = p4y - p3y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-10) return null; // parallel
  const t = ((p3x - p1x) * d2y - (p3y - p1y) * d2x) / denom;
  const u = ((p3x - p1x) * d1y - (p3y - p1y) * d1x) / denom;
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return t;
  return null;
}

// Closest point on segment for overlap fallback
function closestPointOnSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): { x: number; y: number } {
  const abx = bx - ax,
    aby = by - ay;
  const len2 = abx * abx + aby * aby;
  if (len2 === 0) return { x: ax, y: ay };
  const t = Math.max(
    0,
    Math.min(1, ((px - ax) * abx + (py - ay) * aby) / len2),
  );
  return { x: ax + t * abx, y: ay + t * aby };
}

// Compute transmission coefficient T on contact
// k = √(2mE) / ℏ
// T = 1 / (1 + (m²g²) / (ℏ⁴k²))
function computeBarrier(obs: Obstacle, ball: Ball) {
  const m = ball.mass;
  const g = obs.barrierStrength;
  const E = ball.ke;
  const k = Math.sqrt(2 * m * E) / HBAR;
  const hbar4 = HBAR ** 4;
  obs.transmission = 1 / (1 + (m * m * g * g) / (hbar4 * k * k));
}

// Reset obstacle state once the ball is far enough away
const CLEAR_DISTANCE = 100; // px from centroid before resetting

export function resetClearedObstacles(ball: Ball, obstacles: Obstacle[]) {
  for (const obs of obstacles) {
    if (!obs.transmitted) continue;
    const verts = obs.vertices;
    const n = verts.length;
    let cx = 0, cy = 0;
    for (const v of verts) { cx += v.x; cy += v.y; }
    cx /= n; cy /= n;
    const dist = Math.hypot(ball.x - cx, ball.y - cy);
    if (dist > CLEAR_DISTANCE) {
      obs.transmitted = false;
      obs.transmission = 0;
    }
  }
}

export function collideBallWithObstacles(ball: Ball, obstacles: Obstacle[]) {
  const radius = BALL_SIZE / 2;
  const prevX = ball.x - ball.dx;
  const prevY = ball.y - ball.dy;

  for (const obs of obstacles) {
    const verts = obs.vertices;
    const n = verts.length;

    // Polygon centroid for determining outward normals
    let cx = 0,
      cy = 0;
    for (const v of verts) {
      cx += v.x;
      cy += v.y;
    }
    cx /= n;
    cy /= n;

    // 1) Swept test: did the ball path cross any edge this frame?
    let bestT = Infinity;
    let hitNx = 0,
      hitNy = 0;

    for (let i = 0; i < n; i++) {
      const a = verts[i];
      const b = verts[(i + 1) % n];
      const t = segmentIntersectT(
        prevX,
        prevY,
        ball.x,
        ball.y,
        a.x,
        a.y,
        b.x,
        b.y,
      );
      if (t !== null && t < bestT) {
        bestT = t;
        const norm = edgeOutwardNormal(a.x, a.y, b.x, b.y, cx, cy);
        hitNx = norm.nx;
        hitNy = norm.ny;
      }
    }

    if (bestT <= 1) {
      // Compute barrier on contact
      computeBarrier(obs, ball);
      const T = obs.transmission;
      const R = 1 - T;

      if (T > R) {
        // Quantum tunneling: ball transmits through the obstacle
        obs.transmitted = true;
        continue; // don't reflect, let the ball pass through
      }

      // Reflect: place ball at crossing point, offset by radius along outward normal
      obs.transmitted = false;
      const hitX = prevX + (ball.x - prevX) * bestT;
      const hitY = prevY + (ball.y - prevY) * bestT;
      ball.x = hitX + hitNx * radius;
      ball.y = hitY + hitNy * radius;

      const dot = ball.dx * hitNx + ball.dy * hitNy;
      ball.dx -= 2 * dot * hitNx;
      ball.dy -= 2 * dot * hitNy;
      continue;
    }

    // 2) Overlap fallback: ball didn't cross an edge but is overlapping
    let minDist = Infinity;
    let bestNx = 0,
      bestNy = 0;

    for (let i = 0; i < n; i++) {
      const a = verts[i];
      const b = verts[(i + 1) % n];
      const cp = closestPointOnSegment(ball.x, ball.y, a.x, a.y, b.x, b.y);
      const dx = ball.x - cp.x;
      const dy = ball.y - cp.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        const norm = edgeOutwardNormal(a.x, a.y, b.x, b.y, cx, cy);
        bestNx = norm.nx;
        bestNy = norm.ny;
      }
    }

    if (minDist < radius) {
      computeBarrier(obs, ball);
      const T = obs.transmission;
      const R = 1 - T;

      if (T > R) {
        obs.transmitted = true;
        continue;
      }

      obs.transmitted = false;
      ball.x += bestNx * (radius - minDist);
      ball.y += bestNy * (radius - minDist);
      const dot = ball.dx * bestNx + ball.dy * bestNy;
      ball.dx -= 2 * dot * bestNx;
      ball.dy -= 2 * dot * bestNy;
    }
  }
}
