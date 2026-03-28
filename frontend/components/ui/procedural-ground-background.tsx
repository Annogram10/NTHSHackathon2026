"use client";

import { useEffect, useRef } from "react";

export default function ProceduralGroundBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const gl = canvas.getContext("webgl");
    if (!gl) {
      return undefined;
    }

    const vsSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);

        float depth = 1.0 / (uv.y + 1.15);
        vec2 gridUv = vec2(uv.x * depth, depth + u_time * 0.15);

        float n = noise(gridUv * 3.5);
        float ripples = sin(gridUv.y * 18.0 + n * 8.0 + u_time * 0.5);
        float topoLine = smoothstep(0.03, 0.0, abs(ripples));

        vec3 baseColor = vec3(0.03, 0.03, 0.06);
        vec3 accentColor = vec3(0.09, 0.1, 0.18);
        vec3 neonColor = vec3(0.62, 0.32, 1.0);

        vec3 finalColor = mix(baseColor, accentColor, n * 0.6);
        finalColor += topoLine * neonColor * depth * 0.38;

        float fade = smoothstep(0.1, -1.0, uv.y);
        finalColor *= (1.0 - length(uv) * 0.45) * (1.0 - fade);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const createShader = (
      context: WebGLRenderingContext,
      type: number,
      source: string
    ) => {
      const shader = context.createShader(type);
      if (!shader) {
        return null;
      }

      context.shaderSource(shader, source);
      context.compileShader(shader);

      if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
        context.deleteShader(shader);
        return null;
      }

      return shader;
    };

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vertexShader || !fragmentShader) {
      return undefined;
    }

    const program = gl.createProgram();
    if (!program) {
      return undefined;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return undefined;
    }

    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, "u_time");
    const resLoc = gl.getUniformLocation(program, "u_resolution");

    let animationFrameId = 0;

    const render = (time: number) => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }

      if (timeLoc) {
        gl.uniform1f(timeLoc, time * 0.001);
      }

      if (resLoc) {
        gl.uniform2f(resLoc, width, height);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = window.requestAnimationFrame(render);
    };

    animationFrameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      if (buffer) {
        gl.deleteBuffer(buffer);
      }
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-20 h-full w-full overflow-hidden bg-zinc-950"
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none opacity-95"
        style={{ filter: "contrast(1.08) brightness(0.92)" }}
      />
    </div>
  );
}
