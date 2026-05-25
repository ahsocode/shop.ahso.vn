"use client";

import { useEffect, useRef } from "react";

type NodePoint = {
  x: number;
  y: number;
  radius: number;
  phase: number;
  accent: "blue" | "red" | "yellow" | "neutral";
};

const NODE_COUNT = 34;
const LINE_DISTANCE = 170;

function createNodes(width: number, height: number): NodePoint[] {
  return Array.from({ length: NODE_COUNT }, (_, index) => {
    const column = index % 9;
    const row = Math.floor(index / 9);
    const jitterX = Math.sin(index * 18.7) * 42;
    const jitterY = Math.cos(index * 11.3) * 36;

    return {
      x: ((column + 0.35) / 9) * width + jitterX,
      y: ((row + 0.45) / 4.2) * height + jitterY,
      radius: 1.8 + (index % 4) * 0.45,
      phase: index * 0.73,
      accent: index % 13 === 0 ? "red" : index % 11 === 0 ? "yellow" : index % 5 === 0 ? "blue" : "neutral",
    };
  });
}

function resolveColor(accent: NodePoint["accent"], alpha: number) {
  switch (accent) {
    case "blue":
      return `rgba(20, 92, 207, ${alpha})`;
    case "red":
      return `rgba(218, 48, 48, ${alpha})`;
    case "yellow":
      return `rgba(216, 167, 23, ${alpha})`;
    default:
      return `rgba(38, 55, 83, ${alpha})`;
  }
}

export function IndustrialMotionBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollProgressRef = useRef(0);
  const scrollYRef = useRef(0);
  const scrollVelocityRef = useRef(0);
  const nodesRef = useRef<NodePoint[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasElement = canvas;
    const rawContext = canvasElement.getContext("2d", { alpha: true });
    if (!rawContext) return;
    const context = rawContext;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let frame = 0;
    let animationFrame = 0;
    let gsapContext: { revert: () => void } | null = null;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvasElement.width = Math.floor(width * devicePixelRatio);
      canvasElement.height = Math.floor(height * devicePixelRatio);
      canvasElement.style.width = `${width}px`;
      canvasElement.style.height = `${height}px`;
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      nodesRef.current = createNodes(width, height);
    }

    function drawGrid(scrollY: number) {
      const gridSize = 96;
      const offset = (scrollY * 0.22) % gridSize;

      context.lineWidth = 1;
      context.strokeStyle = "rgba(31, 61, 104, 0.16)";

      for (let x = -gridSize; x < width + gridSize; x += gridSize) {
        context.beginPath();
        context.moveTo(x + offset, 0);
        context.lineTo(x + offset, height);
        context.stroke();
      }

      for (let y = -gridSize; y < height + gridSize; y += gridSize) {
        context.beginPath();
        context.moveTo(0, y - offset * 0.55);
        context.lineTo(width, y - offset * 0.55);
        context.stroke();
      }
    }

    function drawRails(progress: number, scrollY: number) {
      const railX = width * 0.76;
      const travel = (scrollY * 0.16) % (height * 0.9);

      context.lineWidth = 1.4;
      context.strokeStyle = "rgba(22, 81, 156, 0.34)";
      context.setLineDash([14, 10]);
      context.lineDashOffset = -scrollY * 0.52;
      context.beginPath();
      context.moveTo(railX, -60 + travel);
      context.lineTo(railX, height * 0.42 + travel);
      context.lineTo(width * 0.58, height * 0.58 + travel * 0.18);
      context.lineTo(width * 0.88, height + 80 + travel * 0.12);
      context.stroke();

      context.strokeStyle = "rgba(202, 52, 52, 0.28)";
      context.setLineDash([4, 16]);
      context.lineDashOffset = scrollY * 0.42;
      context.beginPath();
      context.moveTo(width * 0.08, height * 0.18 - travel * 0.14);
      context.lineTo(width * 0.26, height * 0.34 - travel * 0.08);
      context.lineTo(width * 0.18, height * 0.72 + travel * 0.08);
      context.lineTo(width * 0.42, height * 0.9 + travel * 0.05);
      context.stroke();
      context.setLineDash([]);
    }

    function drawScrollScanner(scrollY: number, velocity: number) {
      const y = height * 0.12 + (scrollY * 0.42) % (height * 0.76);
      const speed = Math.min(Math.abs(velocity) / 2600, 1);
      const alpha = 0.24 + speed * 0.34;

      context.lineWidth = 1.25;
      context.strokeStyle = `rgba(20, 92, 207, ${alpha})`;
      context.setLineDash([32, 18, 8, 18]);
      context.lineDashOffset = -scrollY * 0.65;
      context.beginPath();
      context.moveTo(width * 0.06, y);
      context.lineTo(width * 0.34, y + Math.sin(scrollY * 0.006) * 18);
      context.stroke();

      context.strokeStyle = `rgba(218, 48, 48, ${alpha * 0.72})`;
      context.beginPath();
      context.moveTo(width * 0.68, y + 24);
      context.lineTo(width * 0.94, y - Math.cos(scrollY * 0.006) * 16);
      context.stroke();
      context.setLineDash([]);

      context.fillStyle = `rgba(20, 92, 207, ${alpha + 0.08})`;
      context.beginPath();
      context.arc(width * (0.12 + ((scrollY * 0.0012) % 0.76)), y, 3.2 + speed * 2, 0, Math.PI * 2);
      context.fill();
    }

    function drawNodes(time: number, scrollY: number) {
      const nodes = nodesRef.current;

      for (let i = 0; i < nodes.length; i += 1) {
        const first = nodes[i];
        const firstX = first.x + Math.sin(time * 0.0011 + first.phase) * 7;
        const firstY = first.y + Math.cos(time * 0.0009 + first.phase) * 5 - (scrollY * 0.035) % 80;

        for (let j = i + 1; j < nodes.length; j += 1) {
          const second = nodes[j];
          const secondX = second.x + Math.sin(time * 0.0011 + second.phase) * 7;
          const secondY = second.y + Math.cos(time * 0.0009 + second.phase) * 5 - (scrollY * 0.035) % 80;
          const distance = Math.hypot(firstX - secondX, firstY - secondY);

          if (distance < LINE_DISTANCE) {
            context.strokeStyle = `rgba(35, 68, 111, ${0.25 * (1 - distance / LINE_DISTANCE)})`;
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(firstX, firstY);
            context.lineTo(secondX, secondY);
            context.stroke();
          }
        }

        const pulse = 0.55 + Math.sin(time * 0.002 + first.phase) * 0.25;
        context.fillStyle = resolveColor(first.accent, 0.28 + pulse * 0.2);
        context.beginPath();
        context.arc(firstX, firstY, first.radius + pulse, 0, Math.PI * 2);
        context.fill();
      }
    }

    function render(time = 0) {
      frame += 1;
      const progress = scrollProgressRef.current;
      const scrollY = scrollYRef.current || window.scrollY;
      const velocity = scrollVelocityRef.current;

      context.clearRect(0, 0, width, height);
      drawGrid(scrollY);
      drawRails(progress, scrollY);
      drawNodes(time, scrollY);
      drawScrollScanner(scrollY, velocity);

      if (!reduceMotion) {
        animationFrame = window.requestAnimationFrame(render);
      } else if (frame < 2) {
        animationFrame = window.requestAnimationFrame(render);
      }
    }

    async function setupScrollSync() {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);

      gsap.registerPlugin(ScrollTrigger);
      gsapContext = gsap.context(() => {
        ScrollTrigger.create({
          start: 0,
          end: "max",
          onUpdate: (self) => {
            scrollProgressRef.current = self.progress;
            scrollYRef.current = self.scroll();
            scrollVelocityRef.current = self.getVelocity();
          },
        });
      });
    }

    resize();
    setupScrollSync();
    render();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(animationFrame);
      gsapContext?.revert();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 opacity-100"
      aria-hidden="true"
    />
  );
}
