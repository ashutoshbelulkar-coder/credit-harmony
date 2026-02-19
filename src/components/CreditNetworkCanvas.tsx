import { useRef, useEffect, useCallback } from "react";

interface CreditNetworkCanvasProps {
  reduced: boolean;
}

interface NetworkNode {
  label: string;
  angle: number;
  radiusFactor: number;
  phase: number;
  floatAmp: number;
}

interface TravelingParticle {
  lineIdx: number;
  t: number;
  speed: number;
  isOrange: boolean;
  trail: { x: number; y: number }[];
}

interface AmbientDot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseOpacity: number;
  twinklePhase: number;
  size: number;
  isOrange: boolean;
}

const OUTER_NODES: NetworkNode[] = [
  { label: "Banks", angle: -90, radiusFactor: 0.32, phase: 0, floatAmp: 6 },
  { label: "NBFCs", angle: -30, radiusFactor: 0.30, phase: 1.2, floatAmp: 5 },
  { label: "MFIs", angle: 30, radiusFactor: 0.31, phase: 2.4, floatAmp: 7 },
  { label: "Insurance", angle: 90, radiusFactor: 0.33, phase: 3.6, floatAmp: 5 },
  { label: "Fintech", angle: 150, radiusFactor: 0.29, phase: 4.8, floatAmp: 6 },
  { label: "Regulators", angle: 210, radiusFactor: 0.31, phase: 0.8, floatAmp: 4 },
];

const PARTICLE_COUNT = 24;
const AMBIENT_COUNT = 50;
const TRAIL_LENGTH = 5;

const CRIF_ORANGE = "237, 137, 36";
const WHITE = "255, 255, 255";

function deg2rad(d: number) {
  return (d * Math.PI) / 180;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function createParticles(): TravelingParticle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    lineIdx: i % OUTER_NODES.length,
    t: Math.random(),
    speed: 0.12 + Math.random() * 0.18,
    isOrange: i % 3 === 0,
    trail: [],
  }));
}

function createAmbientDots(): AmbientDot[] {
  return Array.from({ length: AMBIENT_COUNT }, (_, i) => ({
    x: Math.random(),
    y: Math.random(),
    vx: (Math.random() - 0.5) * 0.00015,
    vy: (Math.random() - 0.5) * 0.00015,
    baseOpacity: 0.03 + Math.random() * 0.07,
    twinklePhase: Math.random() * Math.PI * 2,
    size: 0.8 + Math.random() * 1.8,
    isOrange: i % 8 === 0,
  }));
}

function getNodePos(
  node: NetworkNode,
  cx: number,
  cy: number,
  orbit: number,
  time: number,
  animate: boolean
) {
  const r = (orbit * node.radiusFactor) / 0.31;
  const floatY = animate
    ? Math.sin(time * 0.4 + node.phase) * node.floatAmp
    : 0;
  return {
    x: cx + Math.cos(deg2rad(node.angle)) * r,
    y: cy + Math.sin(deg2rad(node.angle)) * r + floatY,
  };
}

function getBezierPoint(
  cx: number,
  cy: number,
  cpx: number,
  cpy: number,
  ex: number,
  ey: number,
  t: number
) {
  const u = 1 - t;
  return {
    x: u * u * cx + 2 * u * t * cpx + t * t * ex,
    y: u * u * cy + 2 * u * t * cpy + t * t * ey,
  };
}

function getControlPoint(
  cx: number,
  cy: number,
  nx: number,
  ny: number,
  offset: number
) {
  const mx = (cx + nx) / 2;
  const my = (cy + ny) / 2;
  const dx = nx - cx;
  const dy = ny - cy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return {
    x: mx + (-dy / len) * offset,
    y: my + (dx / len) * offset,
  };
}

export default function CreditNetworkCanvas({
  reduced,
}: CreditNetworkCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const particlesRef = useRef(createParticles());
  const ambientRef = useRef(createAmbientDots());

  const draw = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      w: number,
      h: number,
      time: number,
      animate: boolean
    ) => {
      ctx.clearRect(0, 0, w, h);

      const cx = w * 0.5;
      const cy = h * 0.5;
      const scale = Math.min(w, h);
      const orbit = scale * 0.31;
      const hubRadius = scale * 0.05;
      const nodeRadius = scale * 0.026;

      // --- Ambient dots ---
      const dots = ambientRef.current;
      for (const dot of dots) {
        if (animate) {
          dot.x += dot.vx;
          dot.y += dot.vy;
          if (dot.x < 0 || dot.x > 1) dot.vx *= -1;
          if (dot.y < 0 || dot.y > 1) dot.vy *= -1;
        }
        const twinkle = animate
          ? dot.baseOpacity *
            (0.5 + 0.5 * Math.sin(time * 0.6 + dot.twinklePhase))
          : dot.baseOpacity;
        ctx.beginPath();
        ctx.arc(dot.x * w, dot.y * h, dot.size, 0, Math.PI * 2);
        const color = dot.isOrange ? CRIF_ORANGE : WHITE;
        ctx.fillStyle = `rgba(${color}, ${twinkle})`;
        ctx.fill();
      }

      // --- Orbital rings ---
      if (animate) {
        const orbitRings = [
          { r: orbit * 0.5, dashLen: 3, gap: 8, speed: 0.15, opacity: 0.04 },
          { r: orbit * 0.75, dashLen: 5, gap: 12, speed: -0.1, opacity: 0.035 },
          { r: orbit * 1.05, dashLen: 4, gap: 10, speed: 0.08, opacity: 0.03 },
        ];
        for (const ring of orbitRings) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(time * ring.speed);
          ctx.beginPath();
          ctx.arc(0, 0, ring.r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${WHITE}, ${ring.opacity})`;
          ctx.lineWidth = 0.8;
          ctx.setLineDash([ring.dashLen, ring.gap]);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
      }

      // --- Connection lines (curved bezier) ---
      const nodePositions = OUTER_NODES.map((n) =>
        getNodePos(n, cx, cy, orbit, time, animate)
      );

      const curveOffsets = [25, -20, 30, -25, 22, -28];

      for (let i = 0; i < OUTER_NODES.length; i++) {
        const np = nodePositions[i];
        const cp = getControlPoint(cx, cy, np.x, np.y, curveOffsets[i]);

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(cp.x, cp.y, np.x, np.y);
        ctx.strokeStyle = `rgba(${WHITE}, 0.06)`;
        ctx.lineWidth = 1;
        if (animate) {
          ctx.setLineDash([4, 8]);
          ctx.lineDashOffset = -time * 15;
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // --- Traveling particles with trails ---
      const particles = particlesRef.current;
      for (const p of particles) {
        const np = nodePositions[p.lineIdx];
        const cp = getControlPoint(
          cx,
          cy,
          np.x,
          np.y,
          curveOffsets[p.lineIdx]
        );

        if (animate) {
          p.t += p.speed * 0.007;
          if (p.t > 1) {
            p.t = 0;
            p.lineIdx = (p.lineIdx + 1) % OUTER_NODES.length;
            p.trail = [];
          }
        }

        const pos = getBezierPoint(cx, cy, cp.x, cp.y, np.x, np.y, p.t);
        const edgeFade = Math.sin(p.t * Math.PI);
        const color = p.isOrange ? CRIF_ORANGE : WHITE;

        // Trail
        if (animate && p.trail.length > 0) {
          for (let ti = 0; ti < p.trail.length; ti++) {
            const trailFade = (ti + 1) / (p.trail.length + 1);
            const trailAlpha = edgeFade * 0.3 * (1 - trailFade);
            const trailSize = (p.isOrange ? 2 : 1.5) * (1 - trailFade * 0.6);
            ctx.beginPath();
            ctx.arc(p.trail[ti].x, p.trail[ti].y, trailSize, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${color}, ${trailAlpha})`;
            ctx.fill();
          }
        }

        if (animate) {
          p.trail.push({ x: pos.x, y: pos.y });
          if (p.trail.length > TRAIL_LENGTH) p.trail.shift();
        }

        // Glow
        if (p.isOrange && animate) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${CRIF_ORANGE}, ${0.1 * edgeFade})`;
          ctx.fill();
        }

        // Dot
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, p.isOrange ? 2.8 : 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${(p.isOrange ? 0.8 : 0.55) * edgeFade})`;
        ctx.fill();
      }

      // --- Outer nodes ---
      for (let i = 0; i < OUTER_NODES.length; i++) {
        const node = OUTER_NODES[i];
        const np = nodePositions[i];

        // Halo glow
        ctx.beginPath();
        ctx.arc(np.x, np.y, nodeRadius + 8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${WHITE}, 0.025)`;
        ctx.fill();

        // Node fill
        ctx.beginPath();
        ctx.arc(np.x, np.y, nodeRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${WHITE}, 0.1)`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${WHITE}, 0.25)`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Rotating arc decoration
        if (animate) {
          const arcStart = time * 0.3 + node.phase;
          ctx.beginPath();
          ctx.arc(
            np.x,
            np.y,
            nodeRadius + 4,
            arcStart,
            arcStart + (Math.PI * 2) / 3
          );
          ctx.strokeStyle = `rgba(${WHITE}, 0.12)`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }

        // Label
        const fontSize = Math.max(12, scale * 0.0252);
        ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(${WHITE}, 0.45)`;
        ctx.letterSpacing = "1px";
        ctx.fillText(
          node.label,
          np.x,
          np.y + nodeRadius + Math.max(16, scale * 0.032)
        );
      }

      // --- Hub pulsing rings ---
      if (animate) {
        for (let ri = 0; ri < 2; ri++) {
          const pulseT = ((time * 0.25 + ri * 0.5) % 1);
          const pulseR = hubRadius + pulseT * orbit * 0.35;
          const pulseAlpha = 0.12 * (1 - pulseT);
          ctx.beginPath();
          ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${WHITE}, ${pulseAlpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // --- Central hub ---
      const hubPulse = animate ? 1 + Math.sin(time * 0.6) * 0.06 : 1;
      const hr = hubRadius * hubPulse;

      // Radial glow
      if (animate) {
        const grad = ctx.createRadialGradient(cx, cy, hr * 0.3, cx, cy, hr + 16);
        grad.addColorStop(0, `rgba(${WHITE}, 0.15)`);
        grad.addColorStop(0.6, `rgba(${WHITE}, 0.04)`);
        grad.addColorStop(1, `rgba(${WHITE}, 0)`);
        ctx.beginPath();
        ctx.arc(cx, cy, hr + 16, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, hr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${WHITE}, 0.14)`;
      ctx.fill();
      ctx.strokeStyle = `rgba(${WHITE}, 0.35)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const hubFontSize = Math.max(12, scale * 0.0252);
      ctx.font = `700 ${hubFontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = `rgba(${WHITE}, 0.55)`;
      ctx.fillText("HCB", cx, cy);
      ctx.textBaseline = "alphabetic";
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;
    const dpr = window.devicePixelRatio || 1;

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced) {
        draw(ctx!, rect.width, rect.height, 0, false);
      }
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    if (reduced) {
      return () => {
        running = false;
        ro.disconnect();
      };
    }

    const startTime = performance.now();

    function loop() {
      if (!running || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const elapsed = (performance.now() - startTime) / 1000;
      draw(ctx!, rect.width, rect.height, elapsed, true);
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [reduced, draw]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 hidden h-full w-full lg:block"
      aria-hidden="true"
    />
  );
}
