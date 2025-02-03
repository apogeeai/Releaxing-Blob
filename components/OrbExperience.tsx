'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Volume2, VolumeX, Timer, Sun, Moon, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

const createBirdChirp = (audioContext: AudioContext, masterGain: GainNode) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(2000, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(1500, audioContext.currentTime + 0.1);
  
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.05);
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.1);
  
  oscillator.connect(gainNode);
  gainNode.connect(masterGain);
  
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.1);
  
  return { oscillator, gainNode };
};

const createAmbientSound = (audioContext: AudioContext, masterGain: GainNode) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
  
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, audioContext.currentTime);
  
  gainNode.gain.setValueAtTime(0.02, audioContext.currentTime);
  
  oscillator.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(masterGain);
  
  return { oscillator, gainNode, filter };
};

export default function OrbExperience() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [relaxationTime, setRelaxationTime] = useState(5);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const blobScaleRef = useRef(1);
  const mousePositionRef = useRef(new THREE.Vector2(0, 0));
  const isClickingRef = useRef(false);
  const { setTheme, theme } = useTheme();
  const [blobColor, setBlobColor] = useState({ r: 0.2, g: 0.8, b: 0.4 });
  const ambientSoundRef = useRef<any>(null);
  const chirpIntervalRef = useRef<NodeJS.Timeout | null>(null);
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
        
        vec3 mod289(vec3 x)
        {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }

        vec4 mod289(vec4 x)
        {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }

        vec4 permute(vec4 x)
        {
          return mod289(((x*34.0)+1.0)*x);
        }

        vec4 taylorInvSqrt(vec4 r)
        {
          return 1.79284291400159 - 0.85373472095314 * r;
        }

        vec3 fade(vec3 t) {
          return t*t*t*(t*(t*6.0-15.0)+10.0);
        }

        float cnoise(vec3 P)
        {
          vec3 Pi0 = floor(P);
          vec3 Pi1 = Pi0 + vec3(1.0);
          Pi0 = mod289(Pi0);
          Pi1 = mod289(Pi1);
          vec3 Pf0 = fract(P);
          vec3 Pf1 = Pf0 - vec3(1.0);
          vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
          vec4 iy = vec4(Pi0.yy, Pi1.yy);
          vec4 iz0 = Pi0.zzzz;
          vec4 iz1 = Pi1.zzzz;

          vec4 ixy = permute(permute(ix) + iy);
          vec4 ixy0 = permute(ixy + iz0);
          vec4 ixy1 = permute(ixy + iz1);

          vec4 gx0 = ixy0 * (1.0 / 7.0);
          vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
          gx0 = fract(gx0);
          vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
          vec4 sz0 = step(gz0, vec4(0.0));
          gx0 -= sz0 * (step(0.0, gx0) - 0.5);
          gy0 -= sz0 * (step(0.0, gy0) - 0.5);

          vec4 gx1 = ixy1 * (1.0 / 7.0);
          vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
          gx1 = fract(gx1);
          vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
          vec4 sz1 = step(gz1, vec4(0.0));
          gx1 -= sz1 * (step(0.0, gx1) - 0.5);
          gy1 -= sz1 * (step(0.0, gy1) - 0.5);

          vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
          vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
          vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
          vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
          vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
          vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
          vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
          vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

          vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
          g000 *= norm0.x;
          g010 *= norm0.y;
          g100 *= norm0.z;
          g110 *= norm0.w;
          vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
          g001 *= norm1.x;
          g011 *= norm1.y;
          g101 *= norm1.z;
          g111 *= norm1.w;

          float n000 = dot(g000, Pf0);
          float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
          float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
          float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
          float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
          float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
          float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
          float n111 = dot(g111, Pf1);

          vec3 fade_xyz = fade(Pf0);
          vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
          vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
          float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
          return 2.2 * n_xyz;
        }
        
        void main() {
          vNormal = normal;
          vUv = uv;
          
          vec3 pos = position;
          
          float noiseFreq = 2.0;
          float noiseAmp = 0.3;
          vec3 noisePos = vec3(pos.x * noiseFreq + time, pos.y * noiseFreq + time, pos.z * noiseFreq + time);
          float noise = cnoise(noisePos) * noiseAmp;
          
          vec3 mouseOffset = vec3(mousePosition.x, mousePosition.y, 0.0);
          float dist = length(pos - mouseOffset);
          float mouseInfluence = 0.5 / (dist + 0.5);
          
          pos += normal * (noise + mouseInfluence) * scale * blobScale;
          
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

  const toggleAudio = () => {
    if (!audioEnabled) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
        
        const masterGain = audioContext.createGain();
        masterGain.gain.value = 0.3;
        masterGain.connect(audioContext.destination);
        gainNodeRef.current = masterGain;

        // Create ambient background sound
        const ambient = createAmbientSound(audioContext, masterGain);
        ambient.oscillator.start();
        ambientSoundRef.current = ambient;

        // Schedule random bird chirps
        chirpIntervalRef.current = setInterval(() => {
          if (Math.random() < 0.3) { // 30% chance of chirp every interval
            createBirdChirp(audioContext, masterGain);
          }
        }, 1000);

      } catch (error) {
        console.error('Audio initialization failed:', error);
        return;
      }
    } else {
      if (ambientSoundRef.current) {
        ambientSoundRef.current.oscillator.stop();
        ambientSoundRef.current = null;
      }
      if (chirpIntervalRef.current) {
        clearInterval(chirpIntervalRef.current);
        chirpIntervalRef.current = null;
      }
      audioContextRef.current?.close();
      audioContextRef.current = null;
      gainNodeRef.current = null;
    }
    setAudioEnabled(!audioEnabled);
  };

  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTimeRemaining(relaxationTime * 60);
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

    const particlesGeometry = new THREE.BufferGeometry();
    const particleCount = 1400;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const particleData = new Array(particleCount).fill(null).map(() => ({
      speed: Math.random() * 0.02 + 0.01,
      offset: Math.random() * Math.PI * 2
    }));

    for (let i = 0; i < particleCount * 3; i += 3) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 3 + Math.random() * 3;
      
      positions[i] = Math.cos(angle) * radius;
      positions[i + 1] = Math.sin(angle) * radius;
      positions[i + 2] = (Math.random() - 0.5) * 2;
      
      velocities[i] = (Math.random() - 0.5) * 0.01;
      velocities[i + 1] = (Math.random() - 0.5) * 0.01;
      velocities[i + 2] = (Math.random() - 0.5) * 0.01;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particlesMaterial = new THREE.PointsMaterial({
      color: 0x88ff88,
      size: 0.05,
      transparent: true,
      opacity: 0.6
    });

    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    camera.position.z = 5;

    const handleMouseMove = (event: MouseEvent) => {
      mousePositionRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mousePositionRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
      material.uniforms.mousePosition.value = mousePositionRef.current;
    };

    const handleMouseDown = () => {
      isClickingRef.current = true;
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
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      material.uniforms.time.value = elapsed;
      
      if (isClickingRef.current) {
        blobScaleRef.current = Math.min(blobScaleRef.current + delta * 0.6, 2.0);
      } else {
        blobScaleRef.current = Math.max(blobScaleRef.current - delta * 0.6, 1.0);
      }
      material.uniforms.blobScale.value = blobScaleRef.current;

      const positions = particlesGeometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const { speed, offset } = particleData[i];

        const x = positions[i3];
        const y = positions[i3 + 1];
        const z = positions[i3 + 2];
        
        const distanceToCenter = Math.sqrt(x * x + y * y + z * z);
        
        if (isClickingRef.current && distanceToCenter < 5) {
          positions[i3] += (-x / distanceToCenter) * speed * 2;
          positions[i3 + 1] += (-y / distanceToCenter) * speed * 2;
          positions[i3 + 2] += (-z / distanceToCenter) * speed * 2;
          
          if (distanceToCenter < 1.5) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 4 + Math.random();
            positions[i3] = Math.cos(angle) * radius;
            positions[i3 + 1] = Math.sin(angle) * radius;
            positions[i3 + 2] = (Math.random() - 0.5) * 2;
          }
        } else {
          const angle = elapsed * speed + offset;
          const radius = 3 + Math.sin(elapsed + offset) * 0.5;
          
          positions[i3] = Math.cos(angle) * radius + Math.sin(elapsed * 0.5) * 0.2;
          positions[i3 + 1] = Math.sin(angle) * radius + Math.cos(elapsed * 0.5) * 0.2;
          positions[i3 + 2] += Math.sin(elapsed + offset) * 0.01 * delta;
          
          if (Math.abs(positions[i3 + 2]) > 2) {
            positions[i3 + 2] *= -0.8;
          }
        }
      }
      particlesGeometry.attributes.position.needsUpdate = true;

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
      particlesGeometry.dispose();
      particlesMaterial.dispose();
      renderer.dispose();
    };
  }, [blobColor]);

  useEffect(() => {
    return () => {
      if (chirpIntervalRef.current) {
        clearInterval(chirpIntervalRef.current);
      }
      if (ambientSoundRef.current) {
        ambientSoundRef.current.oscillator.stop();
      }
      audioContextRef.current?.close();
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      <div className="fixed top-5 right-5 flex gap-2">
        <Button
          variant="outline"
          size="icon"
          className="bg-white/20 backdrop-blur-sm hover:bg-white/30"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
      <div className="fixed bottom-5 right-5 flex gap-2">
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30"
            >
              <Palette className="h-4 w-4" />
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Blob Color</h4>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Red</label>
                    <Slider
                      value={[blobColor.r * 100]}
                      onValueChange={(value) => setBlobColor(prev => ({ ...prev, r: value[0] / 100 }))}
                      max={100}
                      step={1}
                      className="w-[60%]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Green</label>
                    <Slider
                      value={[blobColor.g * 100]}
                      onValueChange={(value) => setBlobColor(prev => ({ ...prev, g: value[0] / 100 }))}
                      max={100}
                      step={1}
                      className="w-[60%]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Blue</label>
                    <Slider
                      value={[blobColor.b * 100]}
                      onValueChange={(value) => setBlobColor(prev => ({ ...prev, b: value[0] / 100 }))}
                      max={100}
                      step={1}
                      className="w-[60%]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
        <Button
          variant="outline"
          size="icon"
          className="bg-white/20 backdrop-blur-sm hover:bg-white/30"
          onClick={toggleAudio}
        >
          {audioEnabled ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
      </div>
      <div className="fixed bottom-5 left-5">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30"
            >
              <Timer className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Set Relaxation Timer</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex items-center gap-4">
                <Slider
                  value={[relaxationTime]}
                  onValueChange={(value) => setRelaxationTime(value[0])}
                  min={1}
                  max={60}
                  step={1}
                  className="w-[60%]"
                />
                <span className="text-sm">{relaxationTime} minutes</span>
              </div>
              <Button onClick={startTimer}>Start Timer</Button>
            </div>
          </DialogContent>
        </Dialog>
        {timeRemaining !== null && (
          <div className="mt-2 text-center bg-white/20 backdrop-blur-sm px-3 py-1 rounded-md">
            {formatTime(timeRemaining)}
          </div>
        )}
      </div>
    </div>
  );
}