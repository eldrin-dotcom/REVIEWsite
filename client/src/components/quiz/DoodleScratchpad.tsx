import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  PenTool,
  Eraser,
  RotateCcw,
  Trash2,
  X,
  Minus,
  Maximize2,
  Minimize2,
  Sparkles,
} from 'lucide-react';

interface DoodleScratchpadProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DoodleScratchpad({ isOpen, onClose }: DoodleScratchpadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState<string>('#3b82f6'); // Blue default
  const [lineWidth, setLineWidth] = useState<number>(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);

  // Setup canvas resolution and retain drawing across resize/reopen
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Save existing content before resize
    let savedData: ImageData | null = null;
    const ctx = canvas.getContext('2d');
    if (ctx && canvas.width > 0 && canvas.height > 0) {
      try {
        savedData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch {
        // Ignore canvas read error
      }
    }

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.floor(rect.width);
    const targetHeight = Math.floor(rect.height);

    if (canvas.width !== targetWidth * dpr || canvas.height !== targetHeight * dpr) {
      canvas.width = targetWidth * dpr;
      canvas.height = targetHeight * dpr;
      canvas.style.width = `${targetWidth}px`;
      canvas.style.height = `${targetHeight}px`;

      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (savedData) {
          ctx.putImageData(savedData, 0, 0);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      // Small timeout to ensure DOM container is laid out
      const timer = setTimeout(resizeCanvas, 50);
      window.addEventListener('resize', resizeCanvas);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', resizeCanvas);
      };
    }
  }, [isOpen, isMinimized, resizeCanvas]);

  const saveHistory = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    try {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((prev) => [...prev.slice(-10), data]);
    } catch {
      // Ignore
    }
  };

  const undo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || history.length === 0) return;

    const newHistory = [...history];
    const previous = newHistory.pop();
    setHistory(newHistory);

    if (previous) {
      ctx.putImageData(previous, 0, 0);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    saveHistory();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Helper to get touch/mouse coordinates relative to canvas
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ('clientX' in e) {
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    saveHistory();
    setIsDrawing(true);

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);

    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth;
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) ctx.closePath();
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-50 transition-all duration-200 select-none ${
        isMinimized
          ? 'bottom-20 right-4 w-auto h-auto'
          : 'inset-x-2 bottom-16 sm:bottom-6 sm:right-6 sm:left-auto sm:w-[480px] h-[360px] sm:h-[440px]'
      }`}
    >
      {/* Minimized Pill */}
      {isMinimized ? (
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary text-white font-bold text-xs shadow-xl hover:scale-105 active:scale-95 transition"
        >
          <PenTool className="w-4 h-4" />
          <span>Open Scratchpad ✏️</span>
        </button>
      ) : (
        /* Full Drawing Card */
        <div className="flex flex-col h-full bg-card/95 backdrop-blur-md border border-border rounded-3xl shadow-2xl overflow-hidden ring-1 ring-black/5">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg-secondary/50">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <PenTool className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-text-primary">
                  Computation Scratchpad
                </h3>
                <span className="text-[10px] text-text-secondary hidden sm:inline">
                  Doodle math, circuits, & calculations
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-card transition"
                title="Minimize scratchpad"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-secondary hover:text-danger hover:bg-danger/10 transition"
                title="Close scratchpad"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Canvas Area */}
          <div
            ref={containerRef}
            className="flex-1 relative bg-background/50 cursor-crosshair overflow-hidden touch-none"
          >
            {/* Grid pattern background for engineering sketchpad feel */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.06] dark:opacity-[0.1]"
              style={{
                backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
            />

            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="absolute inset-0 w-full h-full"
            />
          </div>

          {/* Bottom Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-t border-border bg-card">
            {/* Tools (Pen / Eraser) */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTool('pen')}
                className={`p-2 rounded-xl transition ${
                  tool === 'pen'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                }`}
                title="Pen"
              >
                <PenTool className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setTool('eraser')}
                className={`p-2 rounded-xl transition ${
                  tool === 'eraser'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                }`}
                title="Eraser"
              >
                <Eraser className="w-4 h-4" />
              </button>
            </div>

            {/* Color Palette (Pen mode only) */}
            {tool === 'pen' && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-bg-secondary rounded-xl border border-border">
                {[
                  { id: '#3b82f6', label: 'Blue' },
                  { id: '#f43f5e', label: 'Pink/Rose' },
                  { id: '#10b981', label: 'Green' },
                  { id: '#f59e0b', label: 'Amber' },
                  { id: '#ffffff', label: 'White/Light' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    style={{ backgroundColor: c.id }}
                    className={`w-4 h-4 rounded-full border transition-transform ${
                      color === c.id ? 'scale-125 border-text-primary shadow-xs' : 'border-transparent hover:scale-110'
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            )}

            {/* Stroke Thickness */}
            <div className="flex items-center gap-1 text-[11px] font-semibold text-text-secondary">
              {[
                { size: 2, label: 'Thin' },
                { size: 4, label: 'Med' },
                { size: 7, label: 'Thick' },
              ].map((s) => (
                <button
                  key={s.size}
                  type="button"
                  onClick={() => setLineWidth(s.size)}
                  className={`px-2 py-1 rounded-lg text-[10px] transition ${
                    lineWidth === s.size
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'hover:text-text-primary'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Actions: Undo & Clear */}
            <div className="flex items-center gap-1 border-l border-border pl-2">
              <button
                type="button"
                onClick={undo}
                disabled={history.length === 0}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-30 transition"
                title="Undo last stroke"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={clearCanvas}
                className="p-1.5 rounded-lg text-danger/80 hover:text-danger hover:bg-danger/10 transition"
                title="Clear entire canvas"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
