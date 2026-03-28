"use client";

import React, { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, extend, useFrame } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import { motion, useAnimation } from "framer-motion";

const FluidMaterial = shaderMaterial(
  {
    uTime: 0,
    uMouse: new THREE.Vector2(0, 0),
    uColorA: new THREE.Color("#8A2BE2"),
    uColorB: new THREE.Color("#4B0082"),
  },
  `
    uniform float uTime;
    uniform vec2 uMouse;
    varying vec3 vNormal;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
        vNormal = normalize(normalMatrix * normal);
        float mouseDist = distance(position.xy, uMouse * 2.0);
        float displacement = snoise(position * 2.5 + uTime * 0.2) * 0.3;
        displacement -= smoothstep(0.0, 1.5, mouseDist) * 0.5;
        vec3 newPosition = position + normal * displacement;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `,
  `
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    varying vec3 vNormal;

    void main() {
        float fresnel = pow(1.0 + dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        vec3 color = mix(uColorA, uColorB, vNormal.y * 0.5 + 0.5);
        gl_FragColor = vec4(color + fresnel * 0.2, 0.92);
    }
  `
);

extend({ FluidMaterial });

function FluidScene() {
  const materialRef = useRef<InstanceType<typeof FluidMaterial> | null>(null);
  const mouse = useRef(new THREE.Vector2(0, 0));

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.getElapsedTime();
      materialRef.current.uMouse.lerp(mouse.current, 0.05);
    }
  });

  const material = useMemo(() => {
    const shader = new FluidMaterial();
    shader.uColorA = new THREE.Color("#a855f7");
    shader.uColorB = new THREE.Color("#4c1d95");
    shader.blending = THREE.AdditiveBlending;
    shader.transparent = true;
    return shader;
  }, []);

  return (
    <>
      <mesh rotation={[0.2, 0.4, 0]}>
        <icosahedronGeometry args={[1.4, 64]} />
        <primitive ref={materialRef} object={material} attach="material" />
      </mesh>
      <EffectComposer>
        <Bloom
          intensity={1.45}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.9}
        />
      </EffectComposer>
    </>
  );
}

export function LivingFluidOrb() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[1] flex -translate-y-1/2 justify-center">
      <div className="h-[420px] w-[420px] max-w-[85vw] bg-transparent">
        <Canvas
          camera={{ position: [0, 0, 4], fov: 45 }}
          dpr={[1, 1.5]}
          gl={{ alpha: true, antialias: true }}
          style={{ background: "transparent" }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.55} />
            <directionalLight position={[2, 2, 3]} intensity={1.2} />
            <FluidScene />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}

export default function LivingFluidHero() {
  const textControls = useAnimation();
  const buttonControls = useAnimation();
  const headline = "Experience the Flow";

  useEffect(() => {
    textControls.start((i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1 + 1.5,
        duration: 1.2,
        ease: [0.2, 0.65, 0.3, 0.9],
      },
    }));

    buttonControls.start({
      opacity: 1,
      transition: { delay: 2.5, duration: 1 },
    });
  }, [textControls, buttonControls]);

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-transparent">
      <LivingFluidOrb />
      <div className="relative z-10 px-4 text-center">
        <h1 className="text-6xl font-bold tracking-tighter text-slate-100 md:text-8xl">
          {headline.split("").map((char, i) => (
            <motion.span
              key={i}
              custom={i}
              initial={{ opacity: 0, y: 50 }}
              animate={textControls}
              style={{ display: "inline-block" }}
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </h1>
        <motion.p
          custom={headline.length}
          initial={{ opacity: 0, y: 30 }}
          animate={textControls}
          className="mx-auto mt-6 max-w-xl text-lg text-slate-300"
        >
          A new paradigm of digital interaction, where design is not static but
          a living, breathing entity.
        </motion.p>
        <motion.div initial={{ opacity: 0 }} animate={buttonControls} className="mt-10">
          <button className="rounded-full border border-purple-400/30 bg-purple-500/10 px-8 py-3 font-semibold text-white shadow-lg transition-all hover:bg-purple-500/20 hover:shadow-xl">
            Enter the Current
          </button>
        </motion.div>
      </div>
    </div>
  );
}
