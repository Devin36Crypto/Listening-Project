import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  analyserNode: AnalyserNode | null;
  isActive: boolean;
  color?: string;
}

const Visualizer: React.FC<VisualizerProps> = ({
  analyserNode,
  isActive,
  color = '#3b82f6',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  // Configure analyser for time-domain waveform
  useEffect(() => {
    if (analyserNode && isActive) {
      // eslint-disable-next-line react-compiler/react-compiler
      analyserNode.fftSize = 1024;
    }
  }, [analyserNode, isActive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    const drawFlatLine = () => {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.beginPath();
      ctx.moveTo(0, HEIGHT / 2);
      ctx.lineTo(WIDTH, HEIGHT / 2);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    if (!isActive || !analyserNode) {
      drawFlatLine();
      cancelAnimationFrame(animationRef.current);
      return;
    }

    const bufferLength = 1024;
    const dataArray = new Uint8Array(bufferLength);

    let lastDrawTime = 0;
    const fpsLimit = 20; // Drastically reduce FPS to save battery
    const frameInterval = 1000 / fpsLimit;

    const draw = (timestamp: number) => {
      animationRef.current = requestAnimationFrame(draw);

      // Throttling: Skip frames to save CPU/GPU energy
      if (timestamp - lastDrawTime < frameInterval) return;
      lastDrawTime = timestamp;

      // Battery Saver: Don't draw if the page is hidden or inactive
      if (document.visibilityState === 'hidden' || !isActive) {
        return;
      }

      analyserNode.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // Only draw if there's significant audio to show
      let hasSignal = false;
      for (let i = 0; i < bufferLength; i += 4) { // Sample to save loop time
        if (Math.abs(dataArray[i] - 128) > 1) {
          hasSignal = true;
          break;
        }
      }

      if (!hasSignal) {
        drawFlatLine();
        return;
      }

      // Glow effect
      ctx.shadowBlur = 8;
      ctx.shadowColor = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.beginPath();

      const sliceWidth = WIDTH / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * HEIGHT) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(WIDTH, HEIGHT / 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    draw(performance.now());

    return () => {
      cancelAnimationFrame(animationRef.current);
      drawFlatLine();
    };
  }, [isActive, analyserNode, color]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={60}
      className="w-full h-16 rounded-lg bg-slate-900/50 backdrop-blur-sm"
      role="img"
      aria-label="Audio frequency visualizer"
    />
  );
};

export default Visualizer;
