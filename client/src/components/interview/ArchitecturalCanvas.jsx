import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Square,
  Circle,
  Diamond,
  Database,
  ArrowRight,
  Type,
  StickyNote,
  Pencil,
  Eraser,
  MousePointer,
  Trash2,
  Download,
  RotateCcw,
  Plus,
  Layers,
  Server,
  Cpu,
  Globe,
  HardDrive,
  Inbox
} from "lucide-react";

const SYSTEM_STENCILS = [
  { id: "client", label: "Client / App", icon: Globe, defaultText: "Client App", fill: "#eff6ff", stroke: "#3b82f6" },
  { id: "load_balancer", label: "Load Balancer", icon: Layers, defaultText: "Nginx / ALB", fill: "#f0fdf4", stroke: "#22c55e" },
  { id: "microservice", label: "API Microservice", icon: Server, defaultText: "API Service", fill: "#faf5ff", stroke: "#a855f7" },
  { id: "redis", label: "Redis Cache", icon: Cpu, defaultText: "Redis Cache", fill: "#fff1f2", stroke: "#f43f5e" },
  { id: "database", label: "DB Cluster", icon: HardDrive, defaultText: "PostgreSQL DB", fill: "#fffbeb", stroke: "#f59e0b" },
  { id: "queue", label: "Message Queue", icon: Inbox, defaultText: "Kafka Queue", fill: "#f0f9ff", stroke: "#06b6d4" },
];

export default function ArchitecturalCanvas({ socket, yjsProvider = null, initialElements = [], isReadOnly = false }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [tool, setTool] = useState("select"); // "select" | "rect" | "circle" | "diamond" | "cylinder" | "arrow" | "text" | "sticky" | "pencil" | "eraser"
  const [elements, setElements] = useState(initialElements);
  const [selectedId, setSelectedId] = useState(null);
  const [strokeColor, setStrokeColor] = useState("#3b82f6");
  const [fillColor, setFillColor] = useState("#f0f6ff");

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPencilPoints, setCurrentPencilPoints] = useState([]);
  const [dragStart, setDragStart] = useState(null);

  // Sync initial incoming elements
  useEffect(() => {
    if (initialElements && initialElements.length > 0 && elements.length === 0) {
      setElements(initialElements);
    }
  }, [initialElements]);

  // Setup Yjs CRDT Array Sync
  useEffect(() => {
    if (!yjsProvider?.yCanvasArray || yjsProvider.destroyed) return;

    let isSubscribed = true;
    const syncYjsElements = (event, transaction) => {
      if (!isSubscribed) return;
      if (transaction?.origin === "canvas-local") return;
      try {
        const arr = yjsProvider.yCanvasArray.toArray();
        if (Array.isArray(arr) && arr.length > 0) {
          setElements(arr);
        }
      } catch (err) {
        // Safe read catch
      }
    };

    try {
      yjsProvider.yCanvasArray.observe(syncYjsElements);
      syncYjsElements();
    } catch (e) {
      // Ignore initial observe error if doc destroyed
    }

    return () => {
      isSubscribed = false;
      try {
        if (yjsProvider?.yCanvasArray && !yjsProvider.destroyed) {
          yjsProvider.yCanvasArray.unobserve(syncYjsElements);
        }
      } catch (e) {
        // Idempotent catch to eliminate "Tried to remove event handler that doesn't exist"
      }
    };
  }, [yjsProvider]);

  // Setup Socket sync fallback
  useEffect(() => {
    if (!socket) return;

    const handleElementsSync = (data) => {
      if (Array.isArray(data?.elements)) {
        setElements(data.elements);
      }
    };

    socket.on("canvas:elements-sync", handleElementsSync);

    return () => {
      socket.off("canvas:elements-sync", handleElementsSync);
    };
  }, [socket]);

  // Emit state updates to peers via Yjs and Socket
  const broadcastElements = (updatedElements) => {
    setElements(updatedElements);

    if (yjsProvider?.yCanvasArray) {
      try {
        yjsProvider.doc.transact(() => {
          yjsProvider.yCanvasArray.delete(0, yjsProvider.yCanvasArray.length);
          yjsProvider.yCanvasArray.push(updatedElements);
        }, "canvas-local");
      } catch (err) {
        console.error("Yjs canvas update error:", err);
      }
    }

    if (socket) {
      socket.emit("canvas:elements-update", { elements: updatedElements });
    }
  };

  // Resize canvas to parent
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Dot Grid Pattern
    ctx.fillStyle = "#cbd5e1";
    for (let x = 10; x < canvas.width; x += 24) {
      for (let y = 10; y < canvas.height; y += 24) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    // Render all elements
    elements.forEach((el) => {
      ctx.save();
      ctx.lineWidth = el.strokeWidth || 2;
      ctx.strokeStyle = el.stroke || "#334155";
      ctx.fillStyle = el.fill || "#ffffff";

      const isSelected = el.id === selectedId;

      if (el.type === "rect") {
        ctx.beginPath();
        ctx.roundRect(el.x, el.y, el.w, el.h, 8);
        ctx.fill();
        ctx.stroke();

        if (el.text) {
          ctx.fillStyle = "#0f172a";
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(el.text, el.x + el.w / 2, el.y + el.h / 2);
        }
      } else if (el.type === "circle") {
        ctx.beginPath();
        ctx.ellipse(el.x + el.w / 2, el.y + el.h / 2, Math.abs(el.w / 2), Math.abs(el.h / 2), 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        if (el.text) {
          ctx.fillStyle = "#0f172a";
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(el.text, el.x + el.w / 2, el.y + el.h / 2);
        }
      } else if (el.type === "diamond") {
        ctx.beginPath();
        ctx.moveTo(el.x + el.w / 2, el.y);
        ctx.lineTo(el.x + el.w, el.y + el.h / 2);
        ctx.lineTo(el.x + el.w / 2, el.y + el.h);
        ctx.lineTo(el.x, el.y + el.h / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (el.text) {
          ctx.fillStyle = "#0f172a";
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(el.text, el.x + el.w / 2, el.y + el.h / 2);
        }
      } else if (el.type === "cylinder") {
        const rx = el.w / 2;
        const ry = 15;
        ctx.beginPath();
        ctx.ellipse(el.x + rx, el.y + ry, rx, ry, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.rect(el.x, el.y + ry, el.w, el.h - ry * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(el.x + rx, el.y + el.h - ry, rx, ry, 0, 0, Math.PI);
        ctx.fill();
        ctx.stroke();

        if (el.text) {
          ctx.fillStyle = "#0f172a";
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(el.text, el.x + el.w / 2, el.y + el.h / 2);
        }
      } else if (el.type === "sticky") {
        ctx.fillStyle = el.fill || "#fef08a";
        ctx.beginPath();
        ctx.roundRect(el.x, el.y, el.w, el.h, 4);
        ctx.fill();
        ctx.stroke();

        if (el.text) {
          ctx.fillStyle = "#854d0e";
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(el.text, el.x + el.w / 2, el.y + el.h / 2);
        }
      } else if (el.type === "arrow") {
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(el.x2, el.y2);
        ctx.stroke();

        // Arrow head
        const angle = Math.atan2(el.y2 - el.y, el.x2 - el.x);
        const headlen = 10;
        ctx.beginPath();
        ctx.moveTo(el.x2, el.y2);
        ctx.lineTo(el.x2 - headlen * Math.cos(angle - Math.PI / 6), el.y2 - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(el.x2 - headlen * Math.cos(angle + Math.PI / 6), el.y2 - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = el.stroke || "#334155";
        ctx.fill();
      } else if (el.type === "pencil" && el.points?.length > 1) {
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
      }

      // Draw Selection Outline
      if (isSelected) {
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(el.x - 4, el.y - 4, (el.w || 100) + 8, (el.h || 60) + 8);
        ctx.setLineDash([]);
      }

      ctx.restore();
    });
  }, [elements, selectedId]);

  useEffect(() => {
    renderCanvas();
    window.addEventListener("resize", renderCanvas);
    return () => window.removeEventListener("resize", renderCanvas);
  }, [renderCanvas]);

  const addStencil = (stencil) => {
    const newElement = {
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: stencil.id === "database" ? "cylinder" : "rect",
      x: 150 + elements.length * 20,
      y: 150 + elements.length * 20,
      w: 140,
      h: 70,
      stroke: stencil.stroke,
      fill: stencil.fill,
      text: stencil.defaultText,
      strokeWidth: 2
    };

    broadcastElements([...elements, newElement]);
    setSelectedId(newElement.id);
  };

  const handleMouseDown = (e) => {
    if (isReadOnly) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setDragStart({ x, y });

    if (tool === "select") {
      const clicked = elements.slice().reverse().find(
        (el) => x >= el.x && x <= el.x + (el.w || 100) && y >= el.y && y <= el.y + (el.h || 60)
      );
      setSelectedId(clicked ? clicked.id : null);
    } else if (tool === "pencil") {
      setCurrentPencilPoints([{ x, y }]);
    } else if (["rect", "circle", "diamond", "cylinder", "sticky"].includes(tool)) {
      const newEl = {
        id: `el-${Date.now()}`,
        type: tool,
        x,
        y,
        w: 120,
        h: 60,
        stroke: strokeColor,
        fill: tool === "sticky" ? "#fef08a" : fillColor,
        text: tool === "sticky" ? "Sticky Note" : "Component",
        strokeWidth: 2
      };
      broadcastElements([...elements, newEl]);
      setSelectedId(newEl.id);
      setTool("select");
    } else if (tool === "arrow") {
      const newArrow = {
        id: `el-${Date.now()}`,
        type: "arrow",
        x,
        y,
        x2: x + 80,
        y2: y + 40,
        stroke: strokeColor,
        strokeWidth: 2
      };
      broadcastElements([...elements, newArrow]);
      setSelectedId(newArrow.id);
      setTool("select");
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || isReadOnly) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === "pencil") {
      setCurrentPencilPoints((prev) => [...prev, { x, y }]);
    } else if (tool === "select" && selectedId && dragStart) {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      setDragStart({ x, y });

      const updated = elements.map((el) => {
        if (el.id === selectedId) {
          return { ...el, x: el.x + dx, y: el.y + dy };
        }
        return el;
      });
      setElements(updated);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || isReadOnly) return;
    setIsDrawing(false);

    if (tool === "pencil" && currentPencilPoints.length > 1) {
      const newPencil = {
        id: `el-${Date.now()}`,
        type: "pencil",
        points: currentPencilPoints,
        stroke: strokeColor,
        strokeWidth: 2
      };
      broadcastElements([...elements, newPencil]);
      setCurrentPencilPoints([]);
      setTool("select");
    } else if (tool === "select" && selectedId) {
      broadcastElements(elements);
    }
  };

  const handleDeleteSelected = () => {
    if (!selectedId) return;
    const updated = elements.filter((el) => el.id !== selectedId);
    broadcastElements(updated);
    setSelectedId(null);
  };

  const handleClearCanvas = () => {
    if (window.confirm("Clear architectural canvas?")) {
      broadcastElements([]);
      setSelectedId(null);
    }
  };

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const image = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `architecture-diagram-${Date.now()}.png`;
    link.href = image;
    link.click();
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full w-full bg-surface relative font-sans overflow-hidden">
      
      {/* TOOLBAR TOP BAR */}
      {!isReadOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-bg-secondary border-b border-border z-10 shrink-0">
          
          {/* Stencils Quick Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mr-1">Stencils:</span>
            {SYSTEM_STENCILS.map((s) => {
              const IconComp = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => addStencil(s)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-surface hover:bg-bg border border-border rounded-lg text-xs font-bold text-text transition-colors shrink-0 shadow-sm"
                  title={`Add ${s.label}`}
                >
                  <IconComp className="w-3.5 h-3.5" style={{ color: s.stroke }} />
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Tools Picker */}
          <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border">
            <button
              onClick={() => setTool("select")}
              className={`p-1.5 rounded-lg transition-colors ${tool === "select" ? "bg-primary text-white" : "text-text-secondary hover:text-text"}`}
              title="Select & Move"
            >
              <MousePointer className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTool("rect")}
              className={`p-1.5 rounded-lg transition-colors ${tool === "rect" ? "bg-primary text-white" : "text-text-secondary hover:text-text"}`}
              title="Rectangle Box"
            >
              <Square className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTool("circle")}
              className={`p-1.5 rounded-lg transition-colors ${tool === "circle" ? "bg-primary text-white" : "text-text-secondary hover:text-text"}`}
              title="Circle / Node"
            >
              <Circle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTool("diamond")}
              className={`p-1.5 rounded-lg transition-colors ${tool === "diamond" ? "bg-primary text-white" : "text-text-secondary hover:text-text"}`}
              title="Decision Diamond"
            >
              <Diamond className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTool("cylinder")}
              className={`p-1.5 rounded-lg transition-colors ${tool === "cylinder" ? "bg-primary text-white" : "text-text-secondary hover:text-text"}`}
              title="Database Cylinder"
            >
              <Database className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTool("sticky")}
              className={`p-1.5 rounded-lg transition-colors ${tool === "sticky" ? "bg-primary text-white" : "text-text-secondary hover:text-text"}`}
              title="Sticky Note"
            >
              <StickyNote className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTool("arrow")}
              className={`p-1.5 rounded-lg transition-colors ${tool === "arrow" ? "bg-primary text-white" : "text-text-secondary hover:text-text"}`}
              title="Connector Arrow"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTool("pencil")}
              className={`p-1.5 rounded-lg transition-colors ${tool === "pencil" ? "bg-primary text-white" : "text-text-secondary hover:text-text"}`}
              title="Freehand Pencil"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>

          {/* Color & Actions */}
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border-0 p-0"
              title="Stroke Color"
            />
            {selectedId && (
              <button
                onClick={handleDeleteSelected}
                className="p-1.5 bg-danger-bg text-danger hover:bg-danger/20 border border-danger/30 rounded-lg text-xs font-bold transition-colors"
                title="Delete Selected"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleExportPNG}
              className="p-1.5 bg-surface border border-border text-text hover:bg-bg rounded-lg text-xs font-bold transition-colors"
              title="Export PNG"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleClearCanvas}
              className="p-1.5 bg-bg text-text-secondary hover:text-danger rounded-lg text-xs font-bold transition-colors"
              title="Clear Canvas"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* CANVAS DRAWING AREA */}
      <div className="flex-1 w-full relative touch-none bg-surface">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className={`absolute inset-0 block w-full h-full ${
            tool === "select" ? "cursor-default" : "cursor-crosshair"
          }`}
        />
      </div>
    </div>
  );
}
