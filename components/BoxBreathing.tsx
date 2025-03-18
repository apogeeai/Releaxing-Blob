import { useEffect, useRef } from 'react';

const BoxBreathing = ({ isPressed }: { isPressed: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(0);

  const phases = [
    { name: "Breathe in", direction: "up", angle: Math.PI * 1.5 },
    { name: "Hold", direction: "right", angle: 0 },
    { name: "Breathe out", direction: "down", angle: Math.PI * 0.5 },
    { name: "Hold", direction: "left", angle: Math.PI }
  ];

  const drawBreathingBox = (ctx: CanvasRenderingContext2D, progress: number) => {
    const size = 120;
    const boxSize = 72;
    const boxStart = (size - boxSize) / 2;
    const boxEnd = boxStart + boxSize;
    
    ctx.clearRect(0, 0, size, size);
    
    // Set up styles
    ctx.strokeStyle = '#fde682';
    ctx.fillStyle = '#fde682';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Calculate current phase and progress
    const phase = Math.floor(progress * 4) % 4;
    const phaseProgress = (progress * 4) % 1;

    // Draw the completed sides of the box
    for (let i = 0; i < phase; i++) {
      ctx.beginPath();
      if (i === 0) ctx.moveTo(boxStart, boxEnd);
      if (i === 1) ctx.moveTo(boxStart, boxStart);
      if (i === 2) ctx.moveTo(boxEnd, boxStart);
      if (i === 3) ctx.moveTo(boxEnd, boxEnd);

      if (i === 0) ctx.lineTo(boxStart, boxStart);
      if (i === 1) ctx.lineTo(boxEnd, boxStart);
      if (i === 2) ctx.lineTo(boxEnd, boxEnd);
      if (i === 3) ctx.lineTo(boxStart, boxEnd);
      
      ctx.stroke();
    }

    // Draw trailing line behind arrow
    ctx.beginPath();
    let startX, startY, endX, endY, angle;
    if (phase === 0) {
      startX = boxStart;
      startY = boxEnd;
      endX = boxStart;
      endY = boxEnd - (boxSize * phaseProgress);
      angle = Math.PI * 1.5;
    } else if (phase === 1) {
      startX = boxStart;
      startY = boxStart;
      endX = boxStart + (boxSize * phaseProgress);
      endY = boxStart;
      angle = 0;
    } else if (phase === 2) {
      startX = boxEnd;
      startY = boxStart;
      endX = boxEnd;
      endY = boxStart + (boxSize * phaseProgress);
      angle = Math.PI * 0.5;
    } else {
      startX = boxEnd;
      startY = boxEnd;
      endX = boxEnd - (boxSize * phaseProgress);
      endY = boxEnd;
      angle = Math.PI;
    }
    
    // Draw gradient trail
    const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
    gradient.addColorStop(0, 'rgba(253, 230, 130, 0.1)');
    gradient.addColorStop(1, 'rgba(253, 230, 130, 0.8)');
    ctx.strokeStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // Reset stroke style for remaining drawings
    ctx.strokeStyle = '#fde682';

    // Draw dot instead of arrow
    ctx.beginPath();
    ctx.arc(endX, endY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw text
    const text = phases[phase].name;
    ctx.font = 'bold 17px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(text, size/2, boxEnd + 22);

    // Draw countdown (reversed)
    const timeLeft = Math.ceil(phaseProgress * 4);
    ctx.font = 'bold 34px Inter';
    ctx.fillText(timeLeft.toString(), size/2, size/2 + 8);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 120 * dpr;
    canvas.height = 120 * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = '120px';
    canvas.style.height = '120px';

    drawBreathingBox(ctx, 0);

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = ((timestamp - startTimeRef.current) % 16000) / 16000;
      drawBreathingBox(ctx, progress);
      if (isPressed) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    if (isPressed) {
      startTimeRef.current = 0;
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      drawBreathingBox(ctx, 0);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPressed]);

  return (
    <div className="fixed top-5 left-5 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-lg">
      <canvas
        ref={canvasRef}
        style={{ width: 120, height: 120 }}
      />
    </div>
  );
};

export default BoxBreathing; 