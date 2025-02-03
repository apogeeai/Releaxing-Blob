'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function OrbExperience() {
  const containerRef = useRef<HTMLDivElement>(null);
  const blobScaleRef = useRef(1);
  const mousePositionRef = useRef(new THREE.Vector2(0, 0));
  const isClickingRef = useRef(false);
  const [showText, setShowText] = useState(true);
  const blobColor = { r: 0.2, g: 0.8, b: 0.4 };
  const blobMaterialRef = useRef<THREE.ShaderMaterial | null>(null);

  const createShaderMaterial = (color: { r: number, g: number, b: number }) => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        mousePosition: { value: new THREE.Vector2(0, 0) },
        scale: { value: 1.0 },
        blobScale: { value: 1.0 },
        blobColor: { value: new THREE.Vector3(color.r, color.g, color.b) }
      },
      vertexShader: `
        uniform float time;
        uniform vec2 mousePosition;
        uniform float scale;
        uniform float blobScale;

        varying vec3 vNormal;
        varying vec2 vUv;

        void main() {
          vNormal = normal;
          vUv = uv;

          vec3 pos = position;
          float noiseFreq = 2.0;
          float noiseAmp = 0.3;

          vec3 mouseOffset = vec3(mousePosition.x, mousePosition.y, 0.0);
          float dist = length(pos - mouseOffset);
          float mouseInfluence = 0.5 / (dist + 0.5);

          pos += normal * mouseInfluence * scale * blobScale;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec2 vUv;
        uniform float time;
        uniform vec3 blobColor;

        void main() {
          vec3 baseColor = blobColor;
          vec3 lightColor = baseColor + vec3(0.2, 0.1, 0.2);
          vec3 light = normalize(vec3(1.0, 1.0, 1.0));
          float diff = dot(vNormal, light) * 0.5 + 0.5;

          vec3 color = mix(baseColor, lightColor, diff);
          float pulse = sin(time * 2.0) * 0.1 + 0.9;
          color *= pulse;

          gl_FragColor = vec4(color, 0.92);
        }
      `,
      transparent: true
    });
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    const geometry = new THREE.SphereGeometry(1, 128, 128);
    const material = createShaderMaterial(blobColor);
    blobMaterialRef.current = material;

    const blob = new THREE.Mesh(geometry, material);
    scene.add(blob);

    camera.position.z = 5;

    const handleMouseMove = (event: MouseEvent) => {
      mousePositionRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mousePositionRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
      material.uniforms.mousePosition.value = mousePositionRef.current;
    };

    const handleMouseDown = () => {
      isClickingRef.current = true;
      setShowText(false);
    };

    const handleMouseUp = () => {
      isClickingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const delta = clock.getDelta();

      material.uniforms.time.value = elapsed;

      if (isClickingRef.current) {
        blobScaleRef.current = Math.min(blobScaleRef.current + delta * 0.6, 2.0);
      } else {
        blobScaleRef.current = Math.max(blobScaleRef.current - delta * 0.6, 1.0);
      }
      material.uniforms.blobScale.value = blobScaleRef.current;

      renderer.render(scene, camera);
    }

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);

      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }

      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {showText && (
        <div className="fixed top-5 left-5 text-sm text-white/70 bg-black/20 px-3 py-1 rounded-md backdrop-blur-sm transition-opacity duration-300">
          Click to interact
        </div>
      )}
    </div>
  );
}