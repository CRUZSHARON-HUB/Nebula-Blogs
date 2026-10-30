import { useEffect, useRef } from "react";

const PHI = (1 + Math.sqrt(5)) / 2;

function buildIcosahedron() {
  const raw = [];
  for (const a of [-1, 1]) {
    for (const b of [-1, 1]) {
      raw.push([0, a, b * PHI], [a, b * PHI, 0], [a * PHI, 0, b]);
    }
  }
  const norm = Math.sqrt(1 + PHI * PHI);
  const verts = raw.map(([x, y, z]) => [x / norm, y / norm, z / norm]);
  const edges = [];
  for (let i = 0; i < verts.length; i += 1) {
    for (let j = i + 1; j < verts.length; j += 1) {
      const [ax, ay, az] = verts[i];
      const [bx, by, bz] = verts[j];
      const d = Math.hypot(ax - bx, ay - by, az - bz);
      if (d < 1.15) edges.push([i, j]);
    }
  }
  return { verts, edges };
}

const CUBE_VERTS = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
  [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
];
const CUBE_EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

function rotatePoint([x, y, z], rx, ry, rz = 0) {
  const cy = Math.cos(ry);
  const sy = Math.sin(ry);
  const cx = Math.cos(rx);
  const sx = Math.sin(rx);
  const cz = Math.cos(rz);
  const sz = Math.sin(rz);
  let nx = x * cy + z * sy;
  let nz = -x * sy + z * cy;
  let ny = y * cx - nz * sx;
  nz = y * sx + nz * cx;
  const ox = nx * cz - ny * sz;
  ny = nx * sz + ny * cz;
  return [ox, ny, nz];
}

function makeCube() {
  return {
    pos: [
      (Math.random() - 0.5) * 3.4,
      (Math.random() - 0.5) * 2.4,
      (Math.random() - 0.5) * 2.8,
    ],
    size: 0.08 + Math.random() * 0.16,
    rx: Math.random() * Math.PI,
    ry: Math.random() * Math.PI,
    speed: 0.1 + Math.random() * 0.3,
    hue: Math.random(),
  };
}

export function Starfield() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const icosa = buildIcosahedron();
    const stars = Array.from({ length: 170 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.35 + Math.random() * 1.25,
      depth: 0.25 + Math.random() * 0.75,
      twinkle: Math.random() * Math.PI * 2,
    }));
    const cubes = Array.from({ length: 11 }, makeCube);
    const palette = ["#8b5cf6", "#22d3ee", "#f472b6", "#a78bfa"];

    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let time = 0;
    let last = performance.now();
    let paused = false;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    const onPointerMove = (event) => {
      pointer.tx = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (event.clientY / window.innerHeight - 0.5) * 2;
    };

    const onVisibility = () => {
      paused = document.hidden;
      if (!paused) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    const sceneX = () => (width > 900 ? width * 0.7 : width * 0.5);
    const sceneY = () => (width > 900 ? height * 0.44 : height * 0.3);
    const radius = () => Math.min(width, height) * (width > 900 ? 0.27 : 0.23);

    const drawScene = (t) => {
      pointer.x += (pointer.tx - pointer.x) * 0.045;
      pointer.y += (pointer.ty - pointer.y) * 0.045;

      const cx = sceneX() + pointer.x * 18;
      const cy = sceneY() + pointer.y * 12;
      const R = radius();
      const camZ = 3.7;
      const focal = 2.1;
      const scale = Math.min(width, height) * 0.22;

      const project = ([x, y, z], extraScale = 1) => {
        const perspective = focal / (z + camZ);
        return [
          cx + x * scale * extraScale * perspective,
          cy + y * scale * extraScale * perspective,
          perspective,
        ];
      };

      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.9);
      halo.addColorStop(0, "rgba(124, 92, 255, 0.16)");
      halo.addColorStop(0.45, "rgba(34, 211, 238, 0.05)");
      halo.addColorStop(1, "rgba(8, 8, 15, 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.9, 0, Math.PI * 2);
      ctx.fill();

      const spinY = t * 0.16 + pointer.x * 0.35;
      const spinX = Math.sin(t * 0.11) * 0.32 + pointer.y * 0.22;

      const rotated = icosa.verts.map((v) => rotatePoint(v, spinX, spinY));
      const projected = rotated.map((v) => project(v));

      for (let i = 0; i < icosa.edges.length; i += 1) {
        const [a, b] = icosa.edges[i];
        const p1 = projected[a];
        const p2 = projected[b];
        const depth = (rotated[a][2] + rotated[b][2]) / 2;
        const alpha = 0.12 + Math.max(0, 1 - (depth + 1.1) / 2.2) * 0.36;
        ctx.strokeStyle = palette[i % 3];
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      const ringPoints = [];
      for (let i = 0; i <= 72; i += 1) {
        const angle = (i / 72) * Math.PI * 2;
        ringPoints.push([Math.cos(angle) * 1.55, Math.sin(angle) * 0.18, Math.sin(angle) * 1.55]);
      }
      ctx.strokeStyle = "rgba(167, 139, 250, 0.3)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ringPoints.forEach((point, index) => {
        const [px, py] = project(rotatePoint(point, spinX + 0.5, spinY));
        if (index === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      const orbitAngle = t * 0.6;
      const sat = rotatePoint(
        [Math.cos(orbitAngle) * 1.55, Math.sin(orbitAngle) * 0.18, Math.sin(orbitAngle) * 1.55],
        spinX + 0.5,
        spinY
      );
      const [satX, satY] = project(sat);
      ctx.fillStyle = "#22d3ee";
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(satX, satY, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      for (const cube of cubes) {
        const rx = cube.rx + t * cube.speed;
        const ry = cube.ry + t * cube.speed * 0.8;
        const offset = Math.sin(t * 0.3 + cube.rx) * 0.1;
        const points = CUBE_VERTS.map((v) =>
          project(
            rotatePoint(v, rx, ry).map(
              (value, index) => value * cube.size + cube.pos[index] + (index === 1 ? offset : 0)
            ),
            0.9
          )
        );
        const color = palette[Math.floor(cube.hue * palette.length)];
        ctx.globalAlpha = 0.14;
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        for (const [a, b] of CUBE_EDGES) {
          ctx.moveTo(points[a][0], points[a][1]);
          ctx.lineTo(points[b][0], points[b][1]);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const drawStars = (t) => {
      ctx.globalCompositeOperation = "lighter";
      for (const star of stars) {
        const px = star.x * width + pointer.x * 26 * star.depth;
        const py = star.y * height + pointer.y * 20 * star.depth;
        const twinkle = 0.35 + 0.55 * Math.abs(Math.sin(t * 0.7 + star.twinkle));
        ctx.globalAlpha = twinkle * star.depth;
        ctx.fillStyle = star.depth > 0.7 ? "#cfd6ff" : "#8b93c9";
        ctx.beginPath();
        ctx.arc(px, py, star.r * star.depth, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    };

    const frame = (now) => {
      if (paused) return;
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += delta;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      drawStars(time);
      drawScene(time);
      raf = requestAnimationFrame(frame);
    };

    if (reduceMotion) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawStars(0);
      drawScene(0);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="starfield" aria-hidden="true" />;
}
