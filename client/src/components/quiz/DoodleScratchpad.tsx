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
  Move,
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
  width?: number;
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

const MIN_WIDTH = 340;
const MIN_HEIGHT = 280;

export default function DoodleScratchpad({ isOpen, onClose }: DoodleScratchpadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const windowRef = useRef<HTMLDivElement | null>(null);
  const cursorElRef = useRef<HTMLDivElement | null>(null);

  // Tools & Inking State
  const [tool, setTool] = useState<ToolMode>('pen');
  const [color, setColor] = useState<string>('#2563eb');
  const [highlighterColor, setHighlighterColor] = useState<string>('#facc15');
  const [baseWidth, setBaseWidth] = useState<number>(3);
  const [paperStyle, setPaperStyle] = useState<PaperStyle>('grid');

  // Window State
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Movable & Resizable Window Position/Size State
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('scratchpad_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const x = Math.max(10, Math.min(window.innerWidth - 120, parsed.x));
          const y = Math.max(10, Math.min(window.innerHeight - 80, parsed.y));
          return { x, y };
        }
      }
    } catch {}
    const defaultW = Math.min(620, window.innerWidth - 32);
    const defaultH = Math.min(500, window.innerHeight - 70);
    return {
      x: Math.max(16, window.innerWidth - defaultW - 24),
      y: Math.max(16, window.innerHeight - defaultH - 36),
    };
  });

  const [size, setSize] = useState<{ width: number; height: number }>(() => {
    try {
      const saved = localStorage.getItem('scratchpad_size');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
          const width = Math.max(MIN_WIDTH, Math.min(window.innerWidth - 20, parsed.width));
          const height = Math.max(MIN_HEIGHT, Math.min(window.innerHeight - 20, parsed.height));
          return { width, height };
        }
      }
    } catch {}
    return {
      width: Math.min(620, window.innerWidth - 32),
      height: Math.min(500, window.innerHeight - 70),
    };
  });

  // Dragging & Resizing Tracking
  const isDraggingRef = useRef<boolean>(false);
  const dragOffsetRef = useRef<{ offsetX: number; offsetY: number }>({ offsetX: 0, offsetY: 0 });
  const [isDraggingState, setIsDraggingState] = useState<boolean>(false);

  const isResizingRef = useRef<boolean>(false);
  const resizeDataRef = useRef<{
    direction: string;
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    initW: number;
    initH: number;
  }>({ direction: '', startX: 0, startY: 0, initX: 0, initY: 0, initW: 0, initH: 0 });
  const [isResizingState, setIsResizingState] = useState<boolean>(false);

  // Stylus Hardware Detection
  const [isStylusActive, setIsStylusActive] = useState<boolean>(false);

  // Custom Pen / Eraser Cursor Mode
  const [activeCursorTool, setActiveCursorTool] = useState<ToolMode>('pen');

  // Undo / Redo History Stacks
  const [history, setHistory] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);

  // Drawing Internal Tracking for Smooth Continuous Inking
  const isDrawingRef = useRef<boolean>(false);
  const lastPointRef = useRef<Point | null>(null);
  const lastMidPointRef = useRef<{ x: number; y: number } | null>(null);
  const smoothedPressureRef = useRef<number>(0.5);
  const lineStartRef = useRef<Point | null>(null);
  const lineSnapshotRef = useRef<ImageData | null>(null);

  // Sync active cursor tool when state changes
  useEffect(() => {
    setActiveCursorTool(tool);
  }, [tool]);

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
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
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
      const timer = setTimeout(resizeCanvas, 50);
      window.addEventListener('resize', resizeCanvas);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', resizeCanvas);
      };
    }
  }, [isOpen, isMinimized, isFullscreen, size, resizeCanvas]);

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

  // Window Drag Handlers
  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    if (isFullscreen || isMinimized) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    setIsDraggingState(true);
    dragOffsetRef.current = {
      offsetX: e.clientX - position.x,
      offsetY: e.clientY - position.y,
    };
  };

  const handleHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const newX = e.clientX - dragOffsetRef.current.offsetX;
    const newY = e.clientY - dragOffsetRef.current.offsetY;

    const clampedX = Math.max(0, Math.min(window.innerWidth - 100, newX));
    const clampedY = Math.max(0, Math.min(window.innerHeight - 60, newY));

    setPosition({ x: clampedX, y: clampedY });
  };

  const handleHeaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDraggingState(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    try {
      localStorage.setItem('scratchpad_pos', JSON.stringify(position));
    } catch {}
  };

  // Window Resize Handlers
  const handleResizeStart = (e: React.PointerEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFullscreen || isMinimized) return;

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isResizingRef.current = true;
    setIsResizingState(true);

    resizeDataRef.current = {
      direction,
      startX: e.clientX,
      startY: e.clientY,
      initX: position.x,
      initY: position.y,
      initW: size.width,
      initH: size.height,
    };
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!isResizingRef.current) return;
    const { direction, startX, startY, initX, initY, initW, initH } = resizeDataRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newW = initW;
    let newH = initH;
    let newX = initX;
    let newY = initY;

    if (direction.includes('e')) {
      newW = Math.max(MIN_WIDTH, Math.min(window.innerWidth - initX - 10, initW + dx));
    }
    if (direction.includes('s')) {
      newH = Math.max(MIN_HEIGHT, Math.min(window.innerHeight - initY - 10, initH + dy));
    }
    if (direction.includes('w')) {
      const potentialW = initW - dx;
      if (potentialW >= MIN_WIDTH) {
        newW = Math.min(initX + initW - 10, potentialW);
        newX = initX + (initW - newW);
      }
    }
    if (direction.includes('n')) {
      const potentialH = initH - dy;
      if (potentialH >= MIN_HEIGHT) {
        newH = Math.min(initY + initH - 10, potentialH);
        newY = initY + (initH - newH);
      }
    }

    setSize({ width: newW, height: newH });
    if (newX !== initX || newY !== initY) {
      setPosition({ x: newX, y: newY });
    }
  };

  const handleResizeEnd = (e: React.PointerEvent) => {
    if (!isResizingRef.current) return;
    isResizingRef.current = false;
    setIsResizingState(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    try {
      localStorage.setItem('scratchpad_size', JSON.stringify(size));
      localStorage.setItem('scratchpad_pos', JSON.stringify(position));
    } catch {}

    resizeCanvas();
  };

  // Determine active inking mode (respects stylus hardware eraser button)
  const resolveActiveTool = (e: React.PointerEvent<HTMLCanvasElement>): ToolMode => {
    if (e.pointerType === 'pen' && (e.buttons === 32 || (e.buttons & 32) !== 0 || e.button === 5)) {
      return 'eraser';
    }
    if (e.shiftKey && tool !== 'eraser') {
      return 'ruler';
    }
    return tool;
  };

  // Custom Cursor DOM Position & Tool Update (Zero Latency)
  const updateCustomCursor = (clientX: number, clientY: number, activeMode: ToolMode) => {
    const cursor = cursorElRef.current;
    const container = containerRef.current;
    if (!cursor || !container) return;

    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    cursor.style.opacity = '1';

    if (activeCursorTool !== activeMode) {
      setActiveCursorTool(activeMode);
    }
  };

  const handleCanvasPointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    const activeMode = tool;
    updateCustomCursor(e.clientX, e.clientY, activeMode);
  };

  const handleCanvasPointerLeave = () => {
    if (cursorElRef.current) {
      cursorElRef.current.style.opacity = '0';
    }
  };

  // Pointer Down (Start stroke)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    e.currentTarget.setPointerCapture(e.pointerId);

    saveSnapshot();
    isDrawingRef.current = true;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let pressure = 0.5;
    if (e.pointerType === 'pen') {
      setIsStylusActive(true);
      pressure = e.pressure > 0 ? e.pressure : 0.5;
    }

    const activeMode = resolveActiveTool(e);
    updateCustomCursor(e.clientX, e.clientY, activeMode);

    if (activeMode === 'ruler') {
      lineStartRef.current = { x, y, pressure };
      lineSnapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return;
    }

    // Initialize smoothing spline state
    smoothedPressureRef.current = pressure;
    const initialWidth = baseWidth * (0.35 + pressure * 1.3);

    lastPointRef.current = { x, y, pressure, width: initialWidth };
    lastMidPointRef.current = { x, y };

    // Initial dot rendering
    if (activeMode === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = baseWidth * 4;
      ctx.beginPath();
      ctx.arc(x, y, (baseWidth * 4) / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (activeMode === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = highlighterColor;
      ctx.lineWidth = baseWidth * 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.arc(x, y, (baseWidth * 4) / 2, 0, Math.PI * 2);
      ctx.fillStyle = highlighterColor;
      ctx.fill();
    } else {
      // Pen: variable pressure dot
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = initialWidth;
      ctx.beginPath();
      ctx.arc(x, y, initialWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Pointer Move (Smooth quadratic Bézier spline inking)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const activeMode = resolveActiveTool(e);
    updateCustomCursor(e.clientX, e.clientY, activeMode);

    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Straight Line / Ruler Live Preview
    if (activeMode === 'ruler') {
      if (!lineStartRef.current || !lineSnapshotRef.current) return;
      ctx.putImageData(lineSnapshotRef.current, 0, 0);

      const rect = canvas.getBoundingClientRect();
      const currentPoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

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

    // Check for coalesced events for high-polling styluses (120Hz/240Hz iPad, Surface Pen, Wacom)
    const rawEvents = (e.nativeEvent as unknown as { getCoalescedEvents?: () => PointerEvent[] })
      .getCoalescedEvents
      ? (e.nativeEvent as unknown as { getCoalescedEvents: () => PointerEvent[] }).getCoalescedEvents()
      : [e.nativeEvent];

    // Compute bounding rect once outside micro-sample loop to avoid browser reflow
    const rect = canvas.getBoundingClientRect();

    for (const rawEv of rawEvents) {
      const currentPoint: Point = {
        x: rawEv.clientX - rect.left,
        y: rawEv.clientY - rect.top,
        pressure: rawEv.pointerType === 'pen' ? (rawEv.pressure > 0 ? rawEv.pressure : 0.5) : 0.5,
      };

      if (!lastPointRef.current || !lastMidPointRef.current) {
        lastPointRef.current = currentPoint;
        lastMidPointRef.current = { x: currentPoint.x, y: currentPoint.y };
        continue;
      }

      // Midpoint quadratic curve for mathematically continuous C1 smoothness
      const midX = (lastPointRef.current.x + currentPoint.x) / 2;
      const midY = (lastPointRef.current.y + currentPoint.y) / 2;

      // Exponential moving average for organic pressure modulation
      smoothedPressureRef.current =
        smoothedPressureRef.current * 0.65 + currentPoint.pressure * 0.35;
      const targetWidth = baseWidth * (0.35 + smoothedPressureRef.current * 1.3);
      const dynamicWidth =
        (lastPointRef.current.width || baseWidth) * 0.55 + targetWidth * 0.45;

      if (activeMode === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = baseWidth * 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(lastMidPointRef.current.x, lastMidPointRef.current.y);
        ctx.quadraticCurveTo(lastPointRef.current.x, lastPointRef.current.y, midX, midY);
        ctx.stroke();
      } else if (activeMode === 'highlighter') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = highlighterColor;
        ctx.lineWidth = baseWidth * 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(lastMidPointRef.current.x, lastMidPointRef.current.y);
        ctx.quadraticCurveTo(lastPointRef.current.x, lastPointRef.current.y, midX, midY);
        ctx.stroke();
      } else {
        // Natural fountain pen dynamic width
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = dynamicWidth;

        ctx.beginPath();
        ctx.moveTo(lastMidPointRef.current.x, lastMidPointRef.current.y);
        ctx.quadraticCurveTo(lastPointRef.current.x, lastPointRef.current.y, midX, midY);
        ctx.stroke();
      }

      lastPointRef.current = { ...currentPoint, width: dynamicWidth };
      lastMidPointRef.current = { x: midX, y: midY };
    }
  };

  // Pointer Up / Cancel (Finish stroke)
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const activeMode = resolveActiveTool(e);

    // Draw clean final segment connecting to the exact endpoint
    if (ctx && lastPointRef.current && lastMidPointRef.current && activeMode !== 'ruler') {
      ctx.beginPath();
      ctx.moveTo(lastMidPointRef.current.x, lastMidPointRef.current.y);
      ctx.lineTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.stroke();
    }

    lastPointRef.current = null;
    lastMidPointRef.current = null;
    lineStartRef.current = null;
    lineSnapshotRef.current = null;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

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

    const isDark =
      document.documentElement.classList.contains('dark') ||
      document.body.getAttribute('data-theme') === 'dark';
    tCtx.fillStyle = isDark ? '#0f172a' : '#ffffff';
    tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    tCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = `reviewsite-notes-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={windowRef}
      style={
        isMinimized
          ? undefined
          : isFullscreen
          ? undefined
          : {
              left: `${position.x}px`,
              top: `${position.y}px`,
              width: `${size.width}px`,
              height: `${size.height}px`,
            }
      }
      className={`fixed z-50 select-none ${
        isDraggingState || isResizingState ? 'transition-none' : 'transition-all duration-150 ease-out'
      } ${
        isMinimized
          ? 'bottom-20 right-4 w-auto h-auto'
          : isFullscreen
          ? 'inset-2 sm:inset-4 flex flex-col'
          : 'flex flex-col'
      }`}
    >
      {/* Minimized Pill */}
      {isMinimized ? (
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary text-white font-bold text-xs shadow-2xl hover:scale-105 active:scale-95 transition ring-2 ring-white/20"
        >
          <PenTool className="w-4 h-4" />
          <span>Open OneNote Scratchpad ✏️</span>
          {isStylusActive && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
        </button>
      ) : (
        /* Full Window Card */
        <div className="relative flex flex-col h-full bg-card/95 backdrop-blur-xl border border-border rounded-3xl shadow-2xl overflow-hidden ring-1 ring-black/10">
          {/* ========================================================= */}
          {/* Draggable Title / Header Bar                              */}
          {/* ========================================================= */}
          <div
            onPointerDown={handleHeaderPointerDown}
            onPointerMove={handleHeaderPointerMove}
            onPointerUp={handleHeaderPointerUp}
            onDoubleClick={() => setIsFullscreen((prev) => !prev)}
            className={`flex items-center justify-between px-3.5 py-2.5 border-b border-border bg-bg-secondary/75 select-none touch-none ${
              isDraggingState ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            title="Drag to move scratchpad window (Double-click to toggle maximize)"
          >
            {/* Title & Stylus Status */}
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-primary text-white shadow-xs">
                <Move className="w-3.5 h-3.5" />
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-black text-text-primary flex items-center gap-1.5">
                    <span>OneNote Scratchpad</span>
                    <span className="text-[10px] text-text-secondary/60 font-medium hidden sm:inline">
                      (Movable &amp; Resizable)
                    </span>
                  </h3>
                  {isStylusActive ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                      Pen Pressure
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Paper selector & Window Actions */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {/* Paper Selector */}
              <div
                data-no-drag
                className="flex items-center gap-0.5 bg-bg-secondary p-1 rounded-xl border border-border text-[11px] font-semibold text-text-secondary cursor-default"
              >
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
                data-no-drag
                type="button"
                onClick={handleDownload}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-card transition"
                title="Save & Download notes as PNG"
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Maximize / Restore Toggle */}
              <button
                data-no-drag
                type="button"
                onClick={() => setIsFullscreen((prev) => !prev)}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-card transition hidden sm:inline-block"
                title={isFullscreen ? 'Restore window size' : 'Maximize window'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Minimize to Floating Pill */}
              <button
                data-no-drag
                type="button"
                onClick={() => setIsMinimized(true)}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-card transition"
                title="Minimize to floating pill"
              >
                <Minus className="w-4 h-4" />
              </button>

              {/* Close */}
              <button
                data-no-drag
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-secondary hover:text-danger hover:bg-danger/10 transition"
                title="Close scratchpad"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* Inking Canvas Area with OneNote Paper & Custom Reticle     */}
          {/* ========================================================= */}
          <div
            ref={containerRef}
            onPointerEnter={handleCanvasPointerEnter}
            onPointerLeave={handleCanvasPointerLeave}
            className="flex-1 relative bg-background/70 overflow-hidden touch-none"
            style={{ cursor: 'none' }}
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

            {/* Custom High-Precision Floating Reticle / Cursor */}
            <div
              ref={cursorElRef}
              className="pointer-events-none absolute left-0 top-0 will-change-transform z-30 transition-opacity duration-75 select-none"
              style={{ transform: 'translate3d(-9999px, -9999px, 0)', opacity: 0 }}
            >
              {activeCursorTool === 'eraser' ? (
                /* Eraser Reticle: exact circular radius footprint with dual outline & center dot */
                <div
                  className="rounded-full border-2 border-rose-500 bg-rose-500/15 flex items-center justify-center shadow-xs"
                  style={{
                    width: `${Math.max(16, baseWidth * 4)}px`,
                    height: `${Math.max(16, baseWidth * 4)}px`,
                    transform: 'translate(-50%, -50%)',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.7), inset 0 0 0 1px rgba(255,255,255,0.4)',
                  }}
                >
                  <span className="w-1 h-1 rounded-full bg-rose-500 inline-block shadow-xs" />
                </div>
              ) : activeCursorTool === 'highlighter' ? (
                /* Highlighter Reticle: translucent marker rectangle */
                <div
                  className="rounded-md border border-slate-900/60 dark:border-white/60 shadow-xs"
                  style={{
                    width: `${Math.max(12, baseWidth * 3.5)}px`,
                    height: `${Math.max(16, baseWidth * 4)}px`,
                    backgroundColor: `${highlighterColor}70`,
                    transform: 'translate(-50%, -50%)',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.8)',
                  }}
                />
              ) : activeCursorTool === 'ruler' ? (
                /* Ruler Reticle: precision crosshair */
                <div
                  className="relative flex items-center justify-center"
                  style={{ transform: 'translate(-50%, -50%)' }}
                >
                  <div className="w-5 h-5 rounded-full border border-primary/80 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  </div>
                </div>
              ) : (
                /* Pen Reticle: precision circular tip with dual contrast outline */
                <div
                  className="relative flex items-center justify-center"
                  style={{ transform: 'translate(-50%, -50%)' }}
                >
                  <div
                    className="rounded-full flex items-center justify-center"
                    style={{
                      width: `${Math.max(7, baseWidth * 1.5)}px`,
                      height: `${Math.max(7, baseWidth * 1.5)}px`,
                      border: `1.5px solid ${color === '#ffffff' ? '#0f172a' : color}`,
                      backgroundColor: `${color}35`,
                      boxShadow: '0 0 0 1px rgba(255,255,255,0.9), 0 0 2px 1px rgba(0,0,0,0.3)',
                    }}
                  >
                    <div
                      className="rounded-full shadow-xs"
                      style={{
                        width: `${Math.max(2.5, baseWidth * 0.4)}px`,
                        height: `${Math.max(2.5, baseWidth * 0.4)}px`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

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

          {/* ========================================================= */}
          {/* OneNote Bottom Toolbar                                    */}
          {/* ========================================================= */}
          <div
            data-no-drag
            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-t border-border bg-card cursor-default"
          >
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

          {/* ========================================================= */}
          {/* Window Resize Handles (Edges & Corners)                   */}
          {/* ========================================================= */}
          {!isFullscreen && (
            <>
              {/* Right edge */}
              <div
                onPointerDown={(e) => handleResizeStart(e, 'e')}
                onPointerMove={handleResizeMove}
                onPointerUp={handleResizeEnd}
                className="absolute top-8 right-0 bottom-8 w-2 cursor-ew-resize hover:bg-primary/20 z-40"
              />
              {/* Bottom edge */}
              <div
                onPointerDown={(e) => handleResizeStart(e, 's')}
                onPointerMove={handleResizeMove}
                onPointerUp={handleResizeEnd}
                className="absolute bottom-0 left-8 right-8 h-2 cursor-ns-resize hover:bg-primary/20 z-40"
              />
              {/* Left edge */}
              <div
                onPointerDown={(e) => handleResizeStart(e, 'w')}
                onPointerMove={handleResizeMove}
                onPointerUp={handleResizeEnd}
                className="absolute top-8 left-0 bottom-8 w-2 cursor-ew-resize hover:bg-primary/20 z-40"
              />
              {/* Top edge */}
              <div
                onPointerDown={(e) => handleResizeStart(e, 'n')}
                onPointerMove={handleResizeMove}
                onPointerUp={handleResizeEnd}
                className="absolute top-0 left-8 right-8 h-2 cursor-ns-resize hover:bg-primary/20 z-40"
              />
              {/* Bottom-Right corner with tactile grip dots */}
              <div
                onPointerDown={(e) => handleResizeStart(e, 'se')}
                onPointerMove={handleResizeMove}
                onPointerUp={handleResizeEnd}
                className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-40 flex items-end justify-end p-1 group"
                title="Drag to resize window"
              >
                <div className="w-3.5 h-3.5 flex flex-col items-end justify-end gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-text-secondary" />
                  </div>
                  <div className="flex gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-text-secondary" />
                    <span className="w-1 h-1 rounded-full bg-text-secondary" />
                  </div>
                  <div className="flex gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-text-secondary" />
                    <span className="w-1 h-1 rounded-full bg-text-secondary" />
                    <span className="w-1 h-1 rounded-full bg-text-secondary" />
                  </div>
                </div>
              </div>
              {/* Bottom-Left corner */}
              <div
                onPointerDown={(e) => handleResizeStart(e, 'sw')}
                onPointerMove={handleResizeMove}
                onPointerUp={handleResizeEnd}
                className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize z-40"
              />
              {/* Top-Right corner */}
              <div
                onPointerDown={(e) => handleResizeStart(e, 'ne')}
                onPointerMove={handleResizeMove}
                onPointerUp={handleResizeEnd}
                className="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize z-40"
              />
              {/* Top-Left corner */}
              <div
                onPointerDown={(e) => handleResizeStart(e, 'nw')}
                onPointerMove={handleResizeMove}
                onPointerUp={handleResizeEnd}
                className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-40"
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
