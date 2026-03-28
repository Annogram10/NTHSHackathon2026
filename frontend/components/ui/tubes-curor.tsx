"use client";

import { useEffect, useRef } from "react";

type Point = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  radius: number;
};

const MAX_POINTS = 18;

export default function TubesCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Point[]>([]);
  const targetRef = useRef({ x: 0, y: 0, visible: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return undefined;
    }

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const onMove = (event: MouseEvent) => {
      targetRef.current = {
        x: event.clientX,
        y: event.clientY,
        visible: true,
      };

      pointsRef.current.push({
        x: event.clientX,
        y: event.clientY,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        life: 1,
        radius: 24 + Math.random() * 18,
      });

      if (pointsRef.current.length > MAX_POINTS) {
        pointsRef.current.shift();
      }
    };

    const onLeave = () => {
      targetRef.current.visible = false;
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);

    let frameId = 0;

    const render = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);

      pointsRef.current = pointsRef.current
        .map((point, index, array) => {
          const next = {
            ...point,
            x: point.x + point.vx,
            y: point.y + point.vy,
            life: point.life - 0.028,
            radius: point.radius * 0.992,
          };

          const alpha = Math.max(next.life, 0);
          const gradient = context.createRadialGradient(
            next.x,
            next.y,
            0,
            next.x,
            next.y,
            Math.max(next.radius, 1)
          );

          gradient.addColorStop(0, `rgba(190, 140, 255, ${alpha * 0.28})`);
          gradient.addColorStop(0.55, `rgba(120, 76, 255, ${alpha * 0.14})`);
          gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

          context.fillStyle = gradient;
          context.beginPath();
          context.arc(next.x, next.y, Math.max(next.radius, 1), 0, Math.PI * 2);
          context.fill();

          const prev = array[index - 1];
          if (prev) {
            context.strokeStyle = `rgba(176, 132, 255, ${alpha * 0.18})`;
            context.lineWidth = Math.max(next.radius * 0.22, 1);
            context.lineCap = "round";
            context.beginPath();
            context.moveTo(prev.x, prev.y);
            context.lineTo(next.x, next.y);
            context.stroke();
          }

          return next;
        })
        .filter((point) => point.life > 0.02);

      if (targetRef.current.visible) {
        context.strokeStyle = "rgba(220, 205, 255, 0.35)";
        context.lineWidth = 1.2;
        context.beginPath();
        context.arc(targetRef.current.x, targetRef.current.y, 10, 0, Math.PI * 2);
        context.stroke();
      }

      frameId = window.requestAnimationFrame(render);
    };

    frameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[60] hidden h-full w-full lg:block"
      aria-hidden="true"
    />
  );
}
