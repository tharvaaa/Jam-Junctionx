/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from "react";

interface WaveParticle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  symbol: string;
  size: number;
  opacity: number;
  color: string;
}

interface CyberOrb {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  color: string;
}

const MUSIC_GLYPHS = ["♪", "♫", "♬", "♩", "∮", "♯", "♭", "𝄢", "𝄞"];
const THEME_COLORS = [
  "rgba(6, 182, 212, 0.28)",   // Cyber Cyan
  "rgba(20, 184, 166, 0.24)",  // Bioluminescent Teal
  "rgba(99, 102, 241, 0.22)",  // Deep Cosmic Indigo
  "rgba(56, 189, 248, 0.26)",  // Electric Sky Blue
  "rgba(16, 185, 129, 0.20)",  // Soft Mint
];

export default function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, radius: 200 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: WaveParticle[] = [];
    let orbs: CyberOrb[] = [];

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initElements();
    };

    const initElements = () => {
      particles = [];
      const count = Math.floor((canvas.width * canvas.height) / 28000) + 14;

      for (let i = 0; i < count; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        particles.push({
          x,
          y,
          baseX: x,
          baseY: y,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          symbol: MUSIC_GLYPHS[Math.floor(Math.random() * MUSIC_GLYPHS.length)],
          size: Math.floor(Math.random() * 12) + 12,
          opacity: Math.random() * 0.25 + 0.12,
          color: THEME_COLORS[Math.floor(Math.random() * THEME_COLORS.length)],
        });
      }

      // Smooth eye-soothing flowing cosmic cyber orbs
      orbs = [
        {
          x: canvas.width * 0.2,
          y: canvas.height * 0.25,
          radius: Math.min(canvas.width, canvas.height) * 0.38,
          vx: 0.25,
          vy: 0.18,
          color: "rgba(6, 182, 212, 0.08)", // Soft Cyan
        },
        {
          x: canvas.width * 0.82,
          y: canvas.height * 0.3,
          radius: Math.min(canvas.width, canvas.height) * 0.42,
          vx: -0.22,
          vy: 0.2,
          color: "rgba(99, 102, 241, 0.09)", // Deep Indigo
        },
        {
          x: canvas.width * 0.5,
          y: canvas.height * 0.85,
          radius: Math.min(canvas.width, canvas.height) * 0.44,
          vx: 0.16,
          vy: -0.2,
          color: "rgba(20, 184, 166, 0.07)", // Mint Teal
        },
        {
          x: canvas.width * 0.15,
          y: canvas.height * 0.8,
          radius: Math.min(canvas.width, canvas.height) * 0.32,
          vx: -0.18,
          vy: -0.14,
          color: "rgba(56, 189, 248, 0.06)", // Electric Sky
        },
      ];
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initElements();

    let step = 0;
    const animate = () => {
      step += 0.01;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Deep, soothing cyber navy backdrop
      ctx.fillStyle = "#060913";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle futuristic grid lines
      ctx.strokeStyle = "rgba(56, 189, 248, 0.02)";
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Render cosmic ambient orbs with soft radial gradients
      orbs.forEach((o) => {
        o.x += o.vx;
        o.y += o.vy;

        if (o.x - o.radius < -120 || o.x + o.radius > canvas.width + 120) o.vx *= -1;
        if (o.y - o.radius < -120 || o.y + o.radius > canvas.height + 120) o.vy *= -1;

        const grad = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.radius);
        grad.addColorStop(0, o.color);
        grad.addColorStop(0.6, o.color.replace("0.08", "0.03").replace("0.09", "0.035").replace("0.07", "0.025").replace("0.06", "0.02"));
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Ambient audio & musical floating particles
      const mouse = mouseRef.current;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -30) p.x = canvas.width + 30;
        if (p.x > canvas.width + 30) p.x = -30;
        if (p.y < -30) p.y = canvas.height + 30;
        if (p.y > canvas.height + 30) p.y = -30;

        // Subtle interactive mouse repulsion
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          const power = (mouse.radius - dist) / mouse.radius;
          const angle = Math.atan2(dy, dx);
          p.x += Math.cos(angle) * power * 2.5;
          p.y += Math.sin(angle) * power * 2.5;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.font = `${p.size}px monospace`;
        ctx.fillStyle = p.color;
        ctx.fillText(p.symbol, -p.size / 2, p.size / 2);
        ctx.restore();
      }

      // Constellation connectors for adjacent particles (futuristic HUD network feel)
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90) {
            ctx.strokeStyle = `rgba(6, 182, 212, ${(1 - dist / 90) * 0.08})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}
