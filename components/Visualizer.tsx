import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  isActive: boolean;
  color?: string;
}

const Visualizer: React.FC<VisualizerProps> = ({ isActive, color = '#3b82f6' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    
    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);
      
      if (!isActive) {
        // Draw a flat line
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.stroke();
        return;
      }

      ctx.beginPath();
      ctx.moveTo(0, height / 2);

      // Simulate waveform
      for (let x = 0; x < width; x++) {
        const y = height / 2 + Math.sin(x * 0.05 + time) * (Math.sin(x * 0.02 + time * 0.5) * 20) * (Math.random() * 0.5 + 0.5);
        ctx.lineTo(x, y);
      }

      ctx.strokeStyle = color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.shadowBlur = 0;

      time += 0.2;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isActive, color]);

  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={60} 
      className="w-full h-16 rounded-lg bg-slate-900/50 backdrop-blur-sm"
    />
  );
};

export default Visualizer;