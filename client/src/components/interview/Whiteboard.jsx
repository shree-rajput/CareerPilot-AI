import React, { useRef, useEffect, useState, useCallback } from 'react';

const Whiteboard = ({ socket, isReadOnly = false }) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    // Set actual size in memory (scaled to account for extra pixel density if needed)
    // For simplicity, we match the parent container's size
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    const context = canvas.getContext('2d');
    context.lineCap = 'round';
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    contextRef.current = context;
  }, [color, brushSize]);

  useEffect(() => {
    initCanvas();

    const handleResize = () => {
      // Save canvas content
      const canvas = canvasRef.current;
      const dataURL = canvas.toDataURL();
      
      initCanvas();
      
      // Restore canvas content
      const img = new Image();
      img.src = dataURL;
      img.onload = () => {
        contextRef.current.drawImage(img, 0, 0);
      };
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initCanvas]);

  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = color;
      contextRef.current.lineWidth = brushSize;
    }
  }, [color, brushSize]);

  useEffect(() => {
    if (!socket) return;

    const handleDraw = (data) => {
      const { x0, y0, x1, y1, color, size } = data;
      const context = contextRef.current;
      if (!context) return;
      
      context.beginPath();
      context.moveTo(x0, y0);
      context.lineTo(x1, y1);
      context.strokeStyle = color;
      context.lineWidth = size;
      context.stroke();
      context.closePath();
      
      // Restore current tool settings
      context.strokeStyle = color;
      context.lineWidth = brushSize;
    };

    const handleClear = () => {
      const canvas = canvasRef.current;
      const context = contextRef.current;
      if (canvas && context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    socket.on('whiteboard:draw', handleDraw);
    socket.on('whiteboard:clear', handleClear);

    return () => {
      socket.off('whiteboard:draw', handleDraw);
      socket.off('whiteboard:clear', handleClear);
    };
  }, [socket, brushSize, color]);

  const drawLine = (x0, y0, x1, y1, emit) => {
    const context = contextRef.current;
    if (!context) return;
    
    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    context.stroke();
    context.closePath();

    if (!emit || !socket) return;
    
    socket.emit('whiteboard:draw', {
      x0,
      y0,
      x1,
      y1,
      color,
      size: brushSize
    });
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    if (isReadOnly) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    setIsDrawing(true);
    // Store current position directly on the ref to avoid state lag
    canvasRef.current.currentX = x;
    canvasRef.current.currentY = y;
  };

  const finishDrawing = () => {
    if (isReadOnly) return;
    setIsDrawing(false);
  };

  const draw = (e) => {
    if (!isDrawing || isReadOnly) return;
    e.preventDefault();
    
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    
    drawLine(canvas.currentX, canvas.currentY, x, y, true);
    
    canvas.currentX = x;
    canvas.currentY = y;
  };

  const clearCanvas = () => {
    if (isReadOnly) return;
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (socket) {
        socket.emit('whiteboard:clear');
      }
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-white rounded-lg shadow-sm overflow-hidden">
      {!isReadOnly && (
        <div className="flex items-center gap-4 p-2 border-b bg-gray-50 border-gray-200">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border-0 p-0"
            title="Brush Color"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Size:</label>
            <input
              type="range"
              min="1"
              max="20"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-24"
            />
          </div>
          <button
            onClick={clearCanvas}
            className="ml-auto px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors text-sm font-medium"
          >
            Clear Board
          </button>
        </div>
      )}
      <div className="flex-1 w-full relative touch-none">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={finishDrawing}
          onMouseOut={finishDrawing}
          onMouseMove={draw}
          onTouchStart={startDrawing}
          onTouchEnd={finishDrawing}
          onTouchCancel={finishDrawing}
          onTouchMove={draw}
          className={`absolute inset-0 block w-full h-full ${isReadOnly ? 'cursor-default' : 'cursor-crosshair'}`}
          style={{ touchAction: 'none' }}
        />
      </div>
    </div>
  );
};

export default Whiteboard;
