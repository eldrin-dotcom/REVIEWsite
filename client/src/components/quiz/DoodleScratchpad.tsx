import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  PenTool,
  Highlighter,
  Eraser,
  Ruler,
  RotateCcw,
  RotateCw,
  Trash2,
  X,
  Minus,
  Maximize2,
  Minimize2,
  Download,
  Grid,
  FileText,
  Sparkles,
} from 'lucide-react';

interface DoodleScratchpadProps {
  isOpen: boolean;
  onClose: () => void;
}

type ToolMode = 'pen' | 'highlighter' | 'eraser' | 'ruler';
type PaperStyle = 'grid' | 'ruled' | 'dots' | 'blank';

interface Point {
  x: number;
  y: number;
  pressure: number;
}

const PEN_COLORS = [
  { id: '#2563eb', label: 'OneNote Blue', preview: '#2563eb' },
  { id: '#0f172a', label: 'Black Ink', preview: '#0f172a' },
  { id: '#dc2626', label: 'Red Pen', preview: '#dc2626' },
  { id: '#16a34a', label: 'Green Pen', preview: '#16a34a' },
  { id: '#9333ea', label: 'Purple Pen', preview: '#9333ea' },
  { id: '#ea580c', label: 'Orange Pen', preview: '#ea580c' },
  { id: '#ffffff', label: 'White Ink', preview: '#ffffff' },
];

const HIGHLIGHTER_COLORS = [
  { id: '#facc15', label: 'Neon Yellow', preview: '#facc15' },
  { id: '#4ade80', label: 'Neon Green', preview: '#4ade80' },
  { id: '#22d3ee', label: 'Neon Cyan', preview: '#22d3ee' },
  { id: '#f472b6', label: 'Neon Pink', preview: '#f472b6' },
];

export default function DoodleScratchpad({ isOpen, onClose }: DoodleScratchpadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Tools & Inking State
  const [tool, setTool] = useState<ToolMode>('pen');
  const [color, setColor] = useState<string>('#2563eb');
  const [highlighterColor, setHighlighterColor] = useState<string>('#facc15');
  const [baseWidth, setBaseWidth] = useState<number>(3);
  const [paperStyle, setPaperStyle] = useState<PaperStyle>('grid');

  // Window State
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Stylus Hardware Detection
  const [isStylusActive, setIsStylusActive] = useState<boolean>(false);

  // Undo / Redo History Stacks
  const [history, setHistory] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);

  // Drawing Internal Tracking
  const isDrawingRef = useRef<boolean>(false);
  const pointsRef = useRef<Point[]>([]);
  const lineStartRef = useRef<Point | null>(null);
  const lineSnapshotRef = useRef<ImageData | null>(null);

  // Setup resolution & DPR scaling while preserving drawings
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let savedData: ImageData | null = null;
    const ctx = canvas.getContext('2d');
    if (ctx && canvas.width > 0 && canvas.height > 0) {
      try {
        savedData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch {
        // Ignore read errors
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
      const timer = setTimeout(resizeCanvas, 60);
      window.addEventListener('resize', resizeCanvas);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', resizeCanvas);
      };
    }
  }, [isOpen, isMinimized, isFullscreen, resizeCanvas]);

  // Snapshot manager
  const saveSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    try {
      const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((prev) => [...prev.slice(-25), snapshot]);
      setRedoStack([]); // New action clears redo
    } catch {
      // Ignore
    }
  }, []);

  const undo = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || history.length === 0) return;

    try {
      const currentSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setRedoStack((prev) => [...prev, currentSnapshot]);

      const newHistory = [...history];
      const previous = newHistory.pop();
      setHistory(newHistory);

      if (previous) {
        ctx.putImageData(previous, 0, 0);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    } catch {
      // Ignore
    }
  }, [history]);

  const redo = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || redoStack.length === 0) return;

    try {
      const nextData = redoStack[redoStack.length - 1];
      setRedoStack((prev) => prev.slice(0, -1));

      const currentSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((prev) => [...prev, currentSnapshot]);

      if (nextData) {
        ctx.putImageData(nextData, 0, 0);
      }
    } catch {
      // Ignore
    }
  }, [redoStack]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    saveSnapshot();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y, shortcuts for tools)
  useEffect(() => {
    if (!isOpen || isMinimized) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        redo();
      } else if (e.key.toLowerCase() === 'p') {
        setTool('pen');
      } else if (e.key.toLowerCase() === 'h') {
        setTool('highlighter');
      } else if (e.key.toLowerCase() === 'e') {
        setTool('eraser');
      } else if (e.key.toLowerCase() === 'r') {
        setTool('ruler');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMinimized, undo, redo]);

  // Pointer event helpers for stylus & touch
  const getPointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 0.5 };
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Stylus pressure detection: normalize active pressure or fallback to 0.5
    let pressure = 0.5;
    if (e.pointerType === 'pen') {
      setIsStylusActive(true);
      pressure = e.pressure > 0 ? e.pressure : 0.5;
    }

    return { x, y, pressure };
  };

  // Determine active inking mode (respects stylus hardware eraser button)
  const resolveActiveTool = (e: React.PointerEvent<HTMLCanvasElement>): ToolMode => {
    // Stylus barrel button or eraser tail (buttons === 32 or button === 5)
    if (e.pointerType === 'pen' && (e.buttons === 32 || (e.buttons & 32) !== 0 || e.button === 5)) {
      return 'eraser';
    }
    // Shift key triggers Ruler / straight line mode on the fly
    if (e.shiftKey && tool !== 'eraser') {
      return 'ruler';
    }
    return tool;
  };

  // Pointer Down (Start stroke)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Capture pointer to receive move events even outside bounds
    e.currentTarget.setPointerCapture(e.pointerId);

    saveSnapshot();
    isDrawingRef.current = true;

    const startPoint = getPointFromEvent(e);
    pointsRef.current = [startPoint];

    const activeMode = resolveActiveTool(e);

    if (activeMode === 'ruler') {
      lineStartRef.current = startPoint;
      lineSnapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return;
    }

    // Configure Context
    if (activeMode === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = baseWidth * 4;
      ctx.beginPath();
      ctx.arc(startPoint.x, startPoint.y, (baseWidth * 4) / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (activeMode === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = highlighterColor;
      ctx.lineWidth = baseWidth * 4;
      ctx.lineCap = 'square';
      ctx.beginPath();
      ctx.moveTo(startPoint.x, startPoint.y);
    } else {
      // Pen: variable pressure
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const strokeW = baseWidth * (0.4 + startPoint.pressure * 1.2);
      ctx.lineWidth = strokeW;

      ctx.beginPath();
      ctx.arc(startPoint.x, startPoint.y, strokeW / 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(startPoint.x, startPoint.y);
    }
  };

  // Pointer Move (Smooth inking)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Check for coalesced events from high-polling styluses (120Hz/240Hz)
    const rawEvents = (e.nativeEvent as unknown as { getCoalescedEvents?: () => PointerEvent[] })
      .getCoalescedEvents
      ? (e.nativeEvent as unknown as { getCoalescedEvents: () => PointerEvent[] }).getCoalescedEvents()
      : [e.nativeEvent];

    const activeMode = resolveActiveTool(e);

    // Straight Line / Ruler Live Preview
    if (activeMode === 'ruler') {
      if (!lineStartRef.current || !lineSnapshotRef.current) return;
      ctx.putImageData(lineSnapshotRef.current, 0, 0);

      const currentPoint = getPointFromEvent(e);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = color;
      ctx.lineWidth = baseWidth;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(lineStartRef.current.x, lineStartRef.current.y);
      ctx.lineTo(currentPoint.x, currentPoint.y);
      ctx.stroke();
      return;
    }

    // Process all sub-pixel micro-samples
    for (const rawEv of rawEvents) {
      const rect = canvas.getBoundingClientRect();
      const currentPoint: Point = {
        x: rawEv.clientX - rect.left,
        y: rawEv.clientY - rect.top,
        pressure: rawEv.pressure > 0 ? rawEv.pressure : 0.5,
      };

      const points = pointsRef.current;
      points.push(currentPoint);

      if (points.length < 2) continue;

      const p1 = points[points.length - 2];
      const p2 = points[points.length - 1];

      // Midpoint quadratic Bezier smoothing for authentic OneNote stroke curve
      const midPoint = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
      };

      if (activeMode === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = baseWidth * 4;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(midPoint.x, midPoint.y);
        ctx.stroke();
      } else if (activeMode === 'highlighter') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = highlighterColor;
        ctx.lineWidth = baseWidth * 4;
        ctx.lineCap = 'square';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(midPoint.x, midPoint.y);
        ctx.stroke();
      } else {
        // Natural pen pressure taper
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Modulate stroke width with stylus pressure
        const dynamicWidth = baseWidth * (0.35 + p2.pressure * 1.3);
        ctx.lineWidth = dynamicWidth;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
        ctx.stroke();
      }
    }
  };

  // Pointer Up / Cancel (Finish stroke)
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    pointsRef.current = [];
    lineStartRef.current = null;
    lineSnapshotRef.current = null;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.closePath();
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
    }
  };

  // Download / Export handwritten calculations as PNG
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tCtx = tempCanvas.getContext('2d');
    if (!tCtx) return;

    // Fill clean solid background for exported image
    const isDark =
      document.documentElement.classList.contains('dark') ||
      document.body.getAttribute('data-theme') === 'dark';
    tCtx.fillStyle = isDark ? '#0f172a' : '#ffffff';
    tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw ink
    tCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = `reviewsite-notes-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-50 transition-all duration-200 select-none ${
        isMinimized
          ? 'bottom-20 right-4 w-auto h-auto'
          : isFullscreen
          ? 'inset-2 sm:inset-4 flex flex-col'
          : 'inset-x-2 bottom-16 sm:bottom-6 sm:right-6 sm:left-auto sm:w-[580px] h-[440px] sm:h-[520px] flex flex-col'
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
          <span>Open OneNote Scratchpad ✏️</span>
          {isStylusActive && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
        </button>
      ) : (
        /* Full Window Card */
        <div className="flex flex-col h-full bg-card/95 backdrop-blur-xl border border-border rounded-3xl shadow-2xl overflow-hidden ring-1 ring-black/5">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border bg-bg-secondary/60">
            {/* Title & Stylus Status */}
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-primary text-white shadow-xs">
                <PenTool className="w-4 h-4" />
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-black text-text-primary">
                    OneNote Scratchpad
                  </h3>
                  {isStylusActive ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                      Pen Pressure On
                    </span>
                  ) : (
                    <span className="text-[10px] text-text-secondary hidden sm:inline">
                      (Stylus &amp; Touch Ready)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Paper selector & Window Actions */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {/* Paper Selector */}
              <div className="flex items-center gap-0.5 bg-bg-secondary p-1 rounded-xl border border-border text-[11px] font-semibold text-text-secondary">
                <button
                  type="button"
                  onClick={() => setPaperStyle('grid')}
                  className={`px-2 py-0.5 rounded-lg transition flex items-center gap-1 ${
                    paperStyle === 'grid'
                      ? 'bg-card text-text-primary shadow-xs font-bold'
                      : 'hover:text-text-primary'
                  }`}
                  title="Engineering Grid Paper"
                >
                  <Grid className="w-3 h-3" />
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaperStyle('ruled')}
                  className={`px-2 py-0.5 rounded-lg transition flex items-center gap-1 ${
                    paperStyle === 'ruled'
                      ? 'bg-card text-text-primary shadow-xs font-bold'
                      : 'hover:text-text-primary'
                  }`}
                  title="Ruled Notebook Lines"
                >
                  <FileText className="w-3 h-3" />
                  <span className="hidden sm:inline">Ruled</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaperStyle('dots')}
                  className={`px-2 py-0.5 rounded-lg transition ${
                    paperStyle === 'dots'
                      ? 'bg-card text-text-primary shadow-xs font-bold'
                      : 'hover:text-text-primary'
                  }`}
                  title="Dot Matrix Paper"
                >
                  Dots
                </button>
                <button
                  type="button"
                  onClick={() => setPaperStyle('blank')}
                  className={`px-2 py-0.5 rounded-lg transition ${
                    paperStyle === 'blank'
                      ? 'bg-card text-text-primary shadow-xs font-bold'
                      : 'hover:text-text-primary'
                  }`}
                  title="Plain Blank Canvas"
                >
                  Blank
                </button>
              </div>

              {/* Download PNG */}
              <button
                type="button"
                onClick={handleDownload}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-card transition"
                title="Save & Download notes as PNG"
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Maximize / Fullscreen Toggle */}
              <button
                type="button"
                onClick={() => setIsFullscreen((prev) => !prev)}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-card transition hidden sm:inline-block"
                title={isFullscreen ? 'Restore window size' : 'Expand to full screen workspace'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Minimize to Floating Pill */}
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-card transition"
                title="Minimize to floating pill"
              >
                <Minus className="w-4 h-4" />
              </button>

              {/* Close */}
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

          {/* Inking Canvas Area with OneNote Paper Backgrounds */}
          <div
            ref={containerRef}
            className="flex-1 relative bg-background/60 cursor-crosshair overflow-hidden touch-none"
          >
            {/* Paper Background Patterns */}
            {paperStyle === 'grid' && (
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.09] dark:opacity-[0.14]"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              />
            )}

            {paperStyle === 'ruled' && (
              <>
                <div
                  className="absolute inset-0 pointer-events-none opacity-[0.11] dark:opacity-[0.15]"
                  style={{
                    backgroundImage: 'linear-gradient(to bottom, currentColor 1px, transparent 1px)',
                    backgroundSize: '100% 28px',
                  }}
                />
                <div className="absolute left-10 top-0 bottom-0 w-[1px] bg-rose-400/40 pointer-events-none" />
              </>
            )}

            {paperStyle === 'dots' && (
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.1] dark:opacity-[0.15]"
                style={{
                  backgroundImage: 'radial-gradient(circle, currentColor 1.2px, transparent 1.2px)',
                  backgroundSize: '18px 18px',
                }}
              />
            )}

            {/* Inking Canvas */}
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="absolute inset-0 w-full h-full touch-none"
              style={{ touchAction: 'none' }}
            />
          </div>

          {/* OneNote Bottom Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-t border-border bg-card">
            {/* Primary Toolset: Pen, Highlighter, Eraser, Ruler */}
            <div className="flex items-center gap-1 bg-bg-secondary p-1 rounded-2xl border border-border">
              <button
                type="button"
                onClick={() => setTool('pen')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  tool === 'pen'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                title="Inking Pen (Pressure-sensitive) [P]"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Pen</span>
              </button>

              <button
                type="button"
                onClick={() => setTool('highlighter')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  tool === 'highlighter'
                    ? 'bg-amber-400 text-slate-900 shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                title="Translucent Highlighter [H]"
              >
                <Highlighter className="w-3.5 h-3.5" />
                <span>Marker</span>
              </button>

              <button
                type="button"
                onClick={() => setTool('eraser')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  tool === 'eraser'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                title="Precision Eraser (or use stylus eraser tail) [E]"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Eraser</span>
              </button>

              <button
                type="button"
                onClick={() => setTool('ruler')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  tool === 'ruler'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                title="Straight Line / Ruler Tool (hold Shift while drawing) [R]"
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>Ruler</span>
              </button>
            </div>

            {/* Colors for Pen Mode */}
            {tool === 'pen' && (
              <div className="flex items-center gap-1 px-2 py-1 bg-bg-secondary rounded-xl border border-border">
                {PEN_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    style={{ backgroundColor: c.preview }}
                    className={`w-5 h-5 rounded-full border transition-transform ${
                      color === c.id
                        ? 'scale-125 border-text-primary ring-2 ring-primary/40 shadow-xs'
                        : 'border-border/60 hover:scale-110'
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            )}

            {/* Colors for Highlighter Mode */}
            {tool === 'highlighter' && (
              <div className="flex items-center gap-1 px-2 py-1 bg-bg-secondary rounded-xl border border-border">
                {HIGHLIGHTER_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setHighlighterColor(c.id)}
                    style={{ backgroundColor: c.preview }}
                    className={`w-5 h-5 rounded-full border transition-transform ${
                      highlighterColor === c.id
                        ? 'scale-125 border-text-primary ring-2 ring-amber-400 shadow-xs'
                        : 'border-border/60 hover:scale-110'
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            )}

            {/* Thickness Preset Buttons */}
            <div className="flex items-center gap-1 bg-bg-secondary px-2 py-1 rounded-xl border border-border text-[11px] font-semibold text-text-secondary">
              {[
                { size: 1.5, label: 'Fine' },
                { size: 3, label: 'Med' },
                { size: 5, label: 'Bold' },
                { size: 8, label: 'Thick' },
              ].map((s) => (
                <button
                  key={s.size}
                  type="button"
                  onClick={() => setBaseWidth(s.size)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] transition ${
                    baseWidth === s.size
                      ? 'bg-card text-primary font-bold shadow-xs'
                      : 'hover:text-text-primary'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Undo, Redo, Clear */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={undo}
                disabled={history.length === 0}
                className="p-1.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-30 transition"
                title="Undo (Ctrl+Z)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={redo}
                disabled={redoStack.length === 0}
                className="p-1.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-30 transition"
                title="Redo (Ctrl+Y)"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={clearCanvas}
                className="p-1.5 rounded-xl text-danger/80 hover:text-danger hover:bg-danger/10 transition"
                title="Clear entire page"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
