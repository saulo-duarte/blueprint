"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Konva from "konva";
import { Stage, Layer, Rect, Line, Circle, Path, Group, Text, Ring, Transformer, Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import { useEditorStore, ToolType } from "@/store/useEditorStore";
import { snap, normalizeX, normalizeY, denormalizeX, denormalizeY } from "@/lib/CanvasUtils";
import { useTheme } from "next-themes";

interface DragRect {
  startX: number;
  startY: number;
  width: number;
  height: number;
}

export default function FloorPlanCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const strokeColor = isDark ? "#ffffff" : "#000000";
  const gridColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";
  const canvasBg = isDark ? "#1e1e2e" : "#f5f5f5";

  const selectedObjectIds = useEditorStore((s) => s.selectedObjectIds);
  const setSelectedObjectIds = useEditorStore((s) => s.setSelectedObjectIds);
  const toggleSelection = useEditorStore((s) => s.toggleSelection);
  const removeObject = useEditorStore((s) => s.removeObject);
  const currentTool = useEditorStore((s) => s.currentTool);
  const setCurrentTool = useEditorStore((s) => s.setCurrentTool);

  const polygons = useEditorStore((s) => s.polygons);
  const doors = useEditorStore((s) => s.doors);
  const pins = useEditorStore((s) => s.pins);
  const drawingPathPoints = useEditorStore((s) => s.drawingPathPoints);

  const addPointToPath = useEditorStore((s) => s.addPointToPath);
  const finishDrawingPath = useEditorStore((s) => s.finishDrawingPath);
  const undoLastPathPoint = useEditorStore((s) => s.undoLastPathPoint);
  const addPolygon = useEditorStore((s) => s.addPolygon);
  const addDoor = useEditorStore((s) => s.addDoor);
  const addPin = useEditorStore((s) => s.addPin);
  const addStair = useEditorStore((s) => s.addStair);
  const stairType = useEditorStore((s) => s.stairType);
  const backgroundImage = useEditorStore((s) => s.backgroundImage);
  const showBackgroundImage = useEditorStore((s) => s.showBackgroundImage);
  const updatePolygonPoints = useEditorStore((s) => s.updatePolygonPoints);
  const updatePolygonPointsTransient = useEditorStore((state) => state.updatePolygonPointsTransient);
  const updateObjectTransform = useEditorStore((s) => s.updateObjectTransform);
  const undo = useEditorStore((s) => s.undo);
  const commitHistory = useEditorStore((s) => s.commitHistory);
  const stairs = useEditorStore((s) => s.stairs);
  const redo = useEditorStore((s) => s.redo);
  const copySelectedObject = useEditorStore((s) => s.copySelectedObject);
  const pasteFromClipboard = useEditorStore((s) => s.pasteFromClipboard);

  const scale = useEditorStore((s) => s.scale);
  const setScale = useEditorStore((s) => s.setScale);
  const stagePos = useEditorStore((s) => s.stagePos);
  const setStagePos = useEditorStore((s) => s.setStagePos);
  const pendingAIChanges = useEditorStore((s) => s.pendingAIChanges);

  // Hover state for polygons
  const [hoveredPolyId, setHoveredPolyId] = useState<string | null>(null);

  // ID of the polygon currently in vertex-editing mode (via double-click)
  const [editingPolyId, setEditingPolyId] = useState<string | null>(null);

  // Drag-to-draw state for rectangle tool
  const [dragRect, setDragRect] = useState<DragRect | null>(null);
  const isDrawingRect = useRef(false);

  // Transformer refs
  const trRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<{ [key: string]: Konva.Node }>({});

  useEffect(() => {
    const nodes = selectedObjectIds
      .map((id) => nodeRefs.current[id])
      .filter((node): node is Konva.Node => !!node);
      
    if (nodes.length > 0) {
      trRef.current?.nodes(nodes);
      trRef.current?.getLayer()?.batchDraw();
    } else {
      trRef.current?.nodes([]);
    }
  }, [selectedObjectIds]);

  // Pan state for cursor
  const [isPanning, setIsPanning] = useState(false);
  
  // Background Image
  const [bgImage] = useImage(backgroundImage || '');

  const wasMiddlePan = useRef(false);
  const middlePanStart = useRef<{ stageX: number, stageY: number, mouseX: number, mouseY: number } | null>(null);
  const prevToolBeforeMiddlePan = useRef<ToolType | null>(null);

  // Live mouse position for draw_path preview line
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // --- Image bounds calculation (The "Work Area") ---
  const workArea = React.useMemo(() => {
    if (!bgImage || dimensions.width === 0 || dimensions.height === 0) {
      return { x: 0, y: 0, width: dimensions.width, height: dimensions.height };
    }
    const ratio = Math.min(dimensions.width / bgImage.width, dimensions.height / bgImage.height) * 0.9;
    const w = bgImage.width * ratio;
    const h = bgImage.height * ratio;
    const x = (dimensions.width - w) / 2;
    const y = (dimensions.height - h) / 2;
    return { x, y, width: w, height: h };
  }, [bgImage, dimensions]);

  const setWorkArea = useEditorStore((s) => s.setWorkArea);
  useEffect(() => {
    setWorkArea(workArea);
  }, [workArea, setWorkArea]);

  // Snap-to-close threshold in pixels
  const CLOSE_THRESHOLD = 30;

  // --- Keyboard shortcuts (deletion, enter, escape) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;

      if (e.key === "Backspace" || e.key === "Delete") {
        if (selectedObjectIds.length > 0 && !editingPolyId) {
          // Check if any selected object is NOT locked
          const canRemove = selectedObjectIds.some(id => {
            const poly = polygons.find(p => p.id === id);
            const door = doors.find(d => d.id === id);
            const pin = pins.find(p => p.id === id);
            const stair = stairs.find(s => s.id === id);
            return (poly && !poly.isLocked) || (door && !door.isLocked) || (pin && !pin.isLocked) || (stair && !stair.isLocked);
          });
          
          if (canRemove) {
            removeObject();
            setEditingPolyId(null);
          }
        }
      }
        if (currentTool === "draw_path") {
          finishDrawingPath();
        }
      if (e.key === "Escape") {
        if (currentTool === "draw_path") setCurrentTool("select");
        setEditingPolyId(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault();
        copySelectedObject();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();
        pasteFromClipboard();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedObjectIds, removeObject, currentTool, finishDrawingPath, workArea, setCurrentTool, polygons, doors, pins, stairs, undoLastPathPoint, undo, redo, drawingPathPoints.length, editingPolyId, copySelectedObject, pasteFromClipboard]);

  // --- Resize observer & Image fitting ---
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateDimensions = (parentW: number, parentH: number) => {
      setDimensions({ width: parentW, height: parentH });
    };

    if (containerRef.current) {
       updateDimensions(containerRef.current.clientWidth, containerRef.current.clientHeight);
    }

    const observer = new ResizeObserver((entries) => {
      updateDimensions(entries[0].contentRect.width, entries[0].contentRect.height);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // --- Stage mouse down ---
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const clickedOnStage = e.target === e.target.getStage();

    // Middle click (button 1) triggers PAN mode temporarily
    if (e.evt.button === 1) {
      const stage = e.target.getStage();
      if (stage) {
        middlePanStart.current = {
          stageX: stage.x(),
          stageY: stage.y(),
          mouseX: e.evt.clientX,
          mouseY: e.evt.clientY,
        };
      }
      prevToolBeforeMiddlePan.current = currentTool;
      wasMiddlePan.current = true;
      setCurrentTool("pan");
      return;
    }

    // Allow adding pin or door anywhere (on stage or on polygon)
    if (currentTool === "pin") {
      const stage = e.target.getStage();
      const pos = stage?.getRelativePointerPosition();
      if (pos) {
        const sx = snap(pos.x); const sy = snap(pos.y);
        const id = `pin-${Date.now()}`;
        addPin({ 
          id, 
          x_norm: normalizeX(sx - workArea.x, workArea.width), 
          y_norm: normalizeY(sy - workArea.y, workArea.height), 
          description: "Novo Defeito", 
          isLocked: false 
        });
        setSelectedObjectIds([id]);
      }
      return;
    }

    if (currentTool === "door") {
      const stage = e.target.getStage();
      const pos = stage?.getRelativePointerPosition();
      if (pos) {
        const sx = snap(pos.x); const sy = snap(pos.y);
        const id = `door-${Date.now()}`;
        addDoor({ 
          id, 
          x_norm: normalizeX(sx - workArea.x, workArea.width), 
          y_norm: normalizeY(sy - workArea.y, workArea.height), 
          width_norm: normalizeX(60, workArea.width), // Default width 60px
          rotation: 0, 
          isLocked: false 
        });
        setSelectedObjectIds([id]);
      }
      return;
    }

    if (currentTool === "stair") {
      const stage = e.target.getStage();
      const pos = stage?.getRelativePointerPosition();
      if (pos) {
        const sx = snap(pos.x); const sy = snap(pos.y);
        const id = `stair-${Date.now()}`;
        addStair({
          id,
          x_norm: normalizeX(sx - workArea.x, workArea.width),
          y_norm: normalizeY(sy - workArea.y, workArea.height),
          width_norm: normalizeX(80, workArea.width),
          length_norm: normalizeY(160, workArea.height),
          type: stairType,
          steps: 8,
          rotation: 0,
          isLocked: false
        });
        setSelectedObjectIds([id]);
      }
      return;
    }

    if (currentTool === "rectangle") {
      const stage = e.target.getStage();
      const pos = stage?.getRelativePointerPosition();
      if (!pos) return;
      const sx = snap(pos.x);
      const sy = snap(pos.y);
      setDragRect({ startX: sx, startY: sy, width: 0, height: 0 });
      isDrawingRect.current = true;
      return;
    }

    if (currentTool === "draw_path") {
      const stage = e.target.getStage();
      const pos = stage?.getRelativePointerPosition();
      if (!pos) return;
      const sx = snap(pos.x); const sy = snap(pos.y);
      const normX = normalizeX(sx - workArea.x, workArea.width);
      const normY = normalizeY(sy - workArea.y, workArea.height);

      // Check if clicking near the first point to close the polygon
      if (drawingPathPoints.length >= 3) {
        const firstPt = drawingPathPoints[0];
        const firstPx = denormalizeX(firstPt.x, workArea.width) + workArea.x;
        const firstPy = denormalizeY(firstPt.y, workArea.height) + workArea.y;
        const dist = Math.hypot(sx - firstPx, sy - firstPy);
        if (dist < CLOSE_THRESHOLD) {
          finishDrawingPath();
          return;
        }
      }

      addPointToPath({ x: normX, y: normY });
      return;
    }

    if (clickedOnStage && currentTool === "select") {
      if (!e.evt.shiftKey) {
        setSelectedObjectIds([]);
        setEditingPolyId(null);
      }
    }
  }, [currentTool, stairType, workArea, addPin, addDoor, addStair, addPointToPath, setSelectedObjectIds, setCurrentTool, drawingPathPoints, finishDrawingPath]);

  // --- Stage mouse move (for drag-to-draw rectangle AND live path preview) ---
  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Handle manual middle-pan movement
    if (wasMiddlePan.current && middlePanStart.current) {
      const dx = e.evt.clientX - middlePanStart.current.mouseX;
      const dy = e.evt.clientY - middlePanStart.current.mouseY;
      setStagePos({
        x: middlePanStart.current.stageX + dx,
        y: middlePanStart.current.stageY + dy,
      });
      return; // Skip other mouse move logic while middle-panning
    }

    const stage = e.target.getStage();
    const pos = stage?.getRelativePointerPosition();
    if (!pos) return;

    // Track mouse position for draw_path live preview
    if (currentTool === "draw_path" && drawingPathPoints.length > 0) {
      setMousePos({ x: snap(pos.x), y: snap(pos.y) });
    }

    if (!isDrawingRect.current || !dragRect) return;
    const sx = snap(pos.x);
    const sy = snap(pos.y);
    setDragRect({ ...dragRect, width: sx - dragRect.startX, height: sy - dragRect.startY });
  }, [dragRect, currentTool, drawingPathPoints, setStagePos]);

  // --- Stage mouse up ---
  const handleMouseUp = useCallback(() => {
    // Handle middle-click pan reset
    if (wasMiddlePan.current && prevToolBeforeMiddlePan.current) {
      setCurrentTool(prevToolBeforeMiddlePan.current);
      wasMiddlePan.current = false;
      prevToolBeforeMiddlePan.current = null;
      return; // Exit early if it was a middle-click pan
    }

    // Handle rectangle drawing finalization
    if (!isDrawingRect.current || !dragRect) return;
    isDrawingRect.current = false;

    const w = Math.abs(dragRect.width);
    const h = Math.abs(dragRect.height);

    if (w < 10 || h < 10) {
      setDragRect(null);
      return; // Too small, ignore
    }

    const nX = normalizeX(Math.min(dragRect.startX, dragRect.startX + dragRect.width) - workArea.x, workArea.width);
    const nY = normalizeY(Math.min(dragRect.startY, dragRect.startY + dragRect.height) - workArea.y, workArea.height);
    const nW = normalizeX(Math.abs(dragRect.width), workArea.width);
    const nH = normalizeY(Math.abs(dragRect.height), workArea.height);

    const newId = `rect-${Date.now()}`;
    addPolygon({
      id: newId,
      name: "Ambiente",
      color: "#cba6f7",
      fillEnabled: false,
      isLocked: false,
      points: [
        { x: nX, y: nY },
        { x: nX + nW, y: nY },
        { x: nX + nW, y: nY + nH },
        { x: nX, y: nY + nH },
      ],
    });
    setDragRect(null);
    setCurrentTool("select");
    setSelectedObjectIds([newId]);
  }, [dragRect, workArea, addPolygon, setCurrentTool, setSelectedObjectIds]);

  // --- Vertex drag handler ---
  const findSnapPoint = (x: number, y: number, excludePolyId?: string, excludePtIndex?: number) => {
    let bestX = x;
    let bestY = y;
    let minSnapDist = 15; // pixels

    // 1. Snap to other polygon vertices
    polygons.forEach(p => {
      p.points.forEach((pt, idx) => {
        if (p.id === excludePolyId && idx === excludePtIndex) return;
        const absX = denormalizeX(pt.x, workArea.width) + workArea.x;
        const absY = denormalizeY(pt.y, workArea.height) + workArea.y;
        const dist = Math.sqrt(Math.pow(x - absX, 2) + Math.pow(y - absY, 2));
        if (dist < minSnapDist) {
          minSnapDist = dist;
          bestX = absX;
          bestY = absY;
        }
      });
    });

    // 2. Orthogonal Snap (align with neighbors in the same poly)
    if (excludePolyId && excludePtIndex !== undefined) {
      const poly = polygons.find(p => p.id === excludePolyId);
      if (poly) {
        const prevIdx = (excludePtIndex - 1 + poly.points.length) % poly.points.length;
        const nextIdx = (excludePtIndex + 1) % poly.points.length;
        
        [prevIdx, nextIdx].forEach(idx => {
          const npt = poly.points[idx];
          const nx = denormalizeX(npt.x, workArea.width) + workArea.x;
          const ny = denormalizeY(npt.y, workArea.height) + workArea.y;
          
          if (Math.abs(x - nx) < 10) bestX = nx;
          if (Math.abs(y - ny) < 10) bestY = ny;
        });
      }
    }

    return { x: bestX, y: bestY };
  };

  const handleVertexDrag = (polyId: string, ptIndex: number, e: Konva.KonvaEventObject<DragEvent>) => {
    const poly = polygons.find(p => p.id === polyId);
    if (!poly || poly.isLocked) return;

    // e.target.x()/y() returns the Konva node position after drag
    const rawX = e.target.x();
    const rawY = e.target.y();
    const { x: sx, y: sy } = findSnapPoint(rawX, rawY, polyId, ptIndex);

    const newPoints = [...poly.points];
    newPoints[ptIndex] = { 
      x: normalizeX(sx - workArea.x, workArea.width), 
      y: normalizeY(sy - workArea.y, workArea.height) 
    };

    // Use transient update during move
    updatePolygonPointsTransient(polyId, newPoints);

    // Sync the Konva node position to the new denormalized value
    // This prevents drift between what React renders and Konva's internal position
    e.target.position({
      x: denormalizeX(newPoints[ptIndex].x, workArea.width) + workArea.x,
      y: denormalizeY(newPoints[ptIndex].y, workArea.height) + workArea.y,
    });
  };

  // --- Zoom handler ---
  const zoomStage = (stage: Konva.Stage, deltaY: number) => {
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const scaleBy = 1.1;
    const newScale = deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

    setScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;

    if (e.evt.ctrlKey) {
      // Zoom
      zoomStage(stage, e.evt.deltaY);
    } else if (e.evt.shiftKey) {
      // Horizontal Pan
      setStagePos({
        x: stage.x() - e.evt.deltaY, // Shift typically swaps deltaY to horizontal
        y: stage.y() - e.evt.deltaX,
      });
    } else {
      // Regular Scroll -> Pan
      setStagePos({
        x: stage.x() - e.evt.deltaX,
        y: stage.y() - e.evt.deltaY,
      });
    }
  };

  const pinSvgPath = "M 0,0 C -5,-8 -10,-15 -10,-20 A 10,10 0 1,1 10,-20 C 10,-15 5,-8 0,0 Z";

  // --- Cursor based on tool ---
  // Custom pen cursor as inline SVG data URI
  const penCursorSvg = `data:image/svg+xml;base64,${btoa(`
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" fill="${isDark ? "#ffffff" : "#000000"}" stroke="${isDark ? "#ffffff" : "#000000"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `)}`;

  const pinCursorSvg = `data:image/svg+xml;base64,${btoa(`
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#f38ba8" stroke="#11111b" stroke-width="1"/>
      <circle cx="12" cy="9" r="2.5" fill="#11111b"/>
    </svg>
  `)}`;

  const getCursor = (): string => {
    if (currentTool === "pan" || isPanning) return "grab";
    if (currentTool === "draw_path") return `url("${penCursorSvg}") 2 22, crosshair`;
    if (currentTool === "pin") return `url("${pinCursorSvg}") 12 22, crosshair`;
    if (currentTool === "rectangle") return "crosshair";
    if (["door", "stair"].includes(currentTool)) return "cell";
    if (currentTool === "select") return ""; // Return empty for "select" so it doesn't override Konva's Transformer cursors
    return "default";
  };

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ backgroundColor: canvasBg, cursor: getCursor() }}>
      {/* Grid dots via CSS */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, ${gridColor} 1px, transparent 1px)`,
          backgroundSize: `${20 * scale}px ${20 * scale}px`,
          backgroundPosition: `${stagePos.x}px ${stagePos.y}px`,
        }}
      />

      {dimensions.width > 0 && dimensions.height > 0 && (
        <Stage
          id="main-stage"
          width={dimensions.width}
          height={dimensions.height}
          pixelRatio={typeof window !== 'undefined' ? window.devicePixelRatio : 1}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          scaleX={scale}
          scaleY={scale}
          x={stagePos.x}
          y={stagePos.y}
          draggable={currentTool === "pan"}
          onDragStart={() => setIsPanning(true)}
          onDragEnd={(e) => {
            setIsPanning(false);
            if (e.target === e.target.getStage()) {
              setStagePos({ x: e.target.x(), y: e.target.y() });
            }
          }}
        >
          <Layer id="main-layer" listening={currentTool !== "pan"}>
            {/* Background Image (z-index 0) */}
            {showBackgroundImage && bgImage && (
              <KonvaImage
                image={bgImage}
                x={workArea.x}
                y={workArea.y}
                width={workArea.width}
                height={workArea.height}
                opacity={0.6}
                listening={false}
              />
            )}

            {/* --- Polygons --- */}
            {polygons.map((poly) => {
              const flatPoints = poly.points.flatMap(p => [
                denormalizeX(p.x, workArea.width) + workArea.x,
                denormalizeY(p.y, workArea.height) + workArea.y,
              ]);
              const isSelected = selectedObjectIds.includes(poly.id);
              const isHovered = hoveredPolyId === poly.id;
              const isEditing = editingPolyId === poly.id;
              
              const defaultFill = isDark ? "rgba(30, 58, 138, 0.4)" : "rgba(191, 219, 254, 0.4)";
              const fill = poly.fillEnabled ? (poly.color || defaultFill) : undefined;
                            // Stroke color: Blue on hover/select, then theme color or purple if AI generated
               let stroke = poly.isAiGenerated ? "#a855f7" : strokeColor;
               if (isSelected) stroke = "#a6e3a1"; // Green for select
               else if (isHovered) stroke = "#1e66f5"; // Blue for hover
 
               const isPolyConforme = poly.isConforme;
               if (isPolyConforme) stroke = isDark ? "#ffffff" : "#000000";

              // Centroid for label
              const centerX = poly.points.reduce((sum, p) => sum + denormalizeX(p.x, workArea.width) + workArea.x, 0) / poly.points.length;
              const centerY = poly.points.reduce((sum, p) => sum + denormalizeY(p.y, workArea.height) + workArea.y, 0) / poly.points.length;

              return (
                 <Group 
                   key={poly.id}
                   ref={(node) => { if (node) nodeRefs.current[poly.id] = node; }}
                   x={0}
                   y={0}
                   scaleX={1}
                   scaleY={1}
                   rotation={0}
                   draggable={!isPolyConforme && !poly.isLocked && !isEditing && currentTool === "select"}
                   listening={currentTool === "select"}
                   onTransformEnd={(e) => {
                     const node = e.target;
                     const transform = node.getTransform();
                     const newPoints = poly.points.map(p => {
                       const absX = denormalizeX(p.x, workArea.width) + workArea.x;
                       const absY = denormalizeY(p.y, workArea.height) + workArea.y;
                       const pt = transform.point({ x: absX, y: absY });
                       return {
                         x: normalizeX(pt.x - workArea.x, workArea.width),
                         y: normalizeY(pt.y - workArea.y, workArea.height)
                       };
                     });
                     updatePolygonPoints(poly.id, newPoints);
                     node.setAttrs({ x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 });
                   }}
                   onDragStart={(e) => {
                     commitHistory();
                     if (!selectedObjectIds.includes(poly.id)) {
                       toggleSelection(poly.id, e.evt.shiftKey);
                     }
                   }}
                   onDragEnd={(e) => {
                     if (poly.isLocked) return;
                     const node = e.target;
                     const dx = node.x();
                     const dy = node.y();
                     
                     if (dx !== 0 || dy !== 0) {
                       const newPoints = poly.points.map(p => ({
                         x: p.x + normalizeX(dx, dimensions.width), // Keep dimensions.width here as dx is in screen pixels
                         y: p.y + normalizeY(dy, dimensions.height) // Keep dimensions.height here as dy is in screen pixels
                       }));
                       updatePolygonPoints(poly.id, newPoints);
                       node.position({ x: 0, y: 0 });
                     }
                   }}
                    onClick={(e) => { 
                        if (currentTool === "select") {
                           toggleSelection(poly.id, e.evt.shiftKey);
                        }
                      }}
                   onDblClick={() => {
                     if (!poly.isLocked) {
                       setSelectedObjectIds([poly.id]);
                       setEditingPolyId(poly.id);
                     }
                   }}
                >
                  
                   {/* The visible Fill layer */}
                    <Line
                      points={flatPoints}
                      fill={isPolyConforme ? "rgba(166, 227, 161, 0.1)" : (poly.fillEnabled !== false ? fill : "transparent")}
                      strokeWidth={0}
                      closed={true}
                      onMouseEnter={() => {
                        if (!isPolyConforme && currentTool === "select") setHoveredPolyId(poly.id);
                      }}
                      onMouseLeave={() => setHoveredPolyId(null)}
                    />

                    {/* Individual Edge segments */}
                    {poly.points.map((pt, i) => {
                      if (poly.invisibleEdges?.includes(i)) return null;
                      const nextPt = poly.points[(i + 1) % poly.points.length];
                      return (
                        <Line
                          key={`edge-${poly.id}-${i}`}
                          points={[
                            denormalizeX(pt.x, workArea.width) + workArea.x,
                            denormalizeY(pt.y, workArea.height) + workArea.y,
                            denormalizeX(nextPt.x, workArea.width) + workArea.x,
                            denormalizeY(nextPt.y, workArea.height) + workArea.y,
                          ]}
                          stroke={isPolyConforme ? (isDark ? "#ffffff" : "#000000") : stroke}
                          strokeWidth={isPolyConforme ? 2 : (isSelected ? 4 : 3)}
                          lineCap="round"
                          lineJoin="round"
                        />
                      );
                    })}

                   {/* Labels: ID and Name */}
                   {(poly.showLabels || isPolyConforme) && (
                     <Group x={centerX} y={centerY} listening={false}>
                       <Rect 
                         fill={isDark ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.9)"}
                         cornerRadius={4}
                         width={100}
                         height={isPolyConforme ? 24 : 40}
                         offsetX={50}
                         offsetY={isPolyConforme ? 12 : 20}
                         stroke={isPolyConforme ? "#a6e3a1" : "transparent"}
                         strokeWidth={1}
                       />
                       <Text 
                         text={poly.name || "Sem nome"}
                         fontSize={48}
                         fontStyle="bold"
                         fill={isDark ? "#ffffff" : "#000000"}
                         width={400}
                         align="center"
                         offsetX={200}
                         offsetY={isPolyConforme ? 24 : 64}
                         scaleX={0.25}
                         scaleY={0.25}
                       />
                       {!isPolyConforme && (
                         <Text 
                           text={`ID: ${poly.id.split("-")[1] || poly.id.slice(-4)}`}
                           fontSize={32}
                           fill={isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"}
                           width={400}
                           align="center"
                           offsetX={200}
                           offsetY={-16}
                           scaleX={0.25}
                           scaleY={0.25}
                         />
                       )}
                     </Group>
                   )}

                  {/* Vertex Anchors (only in editing mode via dblclick) */}
                  {isEditing && !poly.isLocked && poly.points.map((pt, i) => (
                    <Circle
                      key={`anchor-${poly.id}-${i}`}
                      x={denormalizeX(pt.x, workArea.width) + workArea.x}
                      y={denormalizeY(pt.y, workArea.height) + workArea.y}
                      radius={6}
                      fill="#ffffff"
                      stroke="#1e66f5"
                       strokeWidth={2}
                       draggable
                       onDragStart={() => {
                         commitHistory();
                       }}
                       onDragMove={(e) => handleVertexDrag(poly.id, i, e)}
                       onDragEnd={() => {
                         // Commit final position to history
                         const poly = polygons.find(p => p.id === editingPolyId);
                         if (poly) updatePolygonPoints(poly.id, poly.points);
                       }}
                     />
                  ))}
                </Group>
              );
            })}

            {/* --- Drawing path preview --- */}
            {drawingPathPoints.length > 0 && (
              <>
                {/* Placed segments */}
                <Line
                  points={drawingPathPoints.flatMap(p => [
                    denormalizeX(p.x, workArea.width) + workArea.x,
                    denormalizeY(p.y, workArea.height) + workArea.y,
                  ])}
                  stroke={strokeColor}
                  strokeWidth={3}
                  dash={[10, 5]}
                />

                {/* Live preview line from last point to cursor */}
                {mousePos && (
                  <Line
                    points={[
                      denormalizeX(drawingPathPoints[drawingPathPoints.length - 1].x, workArea.width) + workArea.x,
                      denormalizeY(drawingPathPoints[drawingPathPoints.length - 1].y, workArea.height) + workArea.y,
                      mousePos.x,
                      mousePos.y,
                    ]}
                    stroke={strokeColor}
                    strokeWidth={2}
                    opacity={0.5}
                    dash={[6, 4]}
                  />
                )}

                {/* Vertex dots for placed points */}
                  {drawingPathPoints.map((pt, i) => (
                    <Circle
                      key={`path-dot-${i}`}
                      x={denormalizeX(pt.x, workArea.width) + workArea.x}
                      y={denormalizeY(pt.y, workArea.height) + workArea.y}
                      radius={i === 0 ? 7 : 4}
                      fill={i === 0 ? "#a6e3a1" : "#ffffff"}
                      stroke={i === 0 ? "#40a02b" : "#1e66f5"}
                      strokeWidth={2}
                      listening={false} // Disable hit testing so clicks fall through to the Stage (for closing path)
                    />
                  ))}
              </>
            )}

            {/* --- Drag-to-draw rectangle preview --- */}
            {dragRect && (
              <Rect
                x={Math.min(dragRect.startX, dragRect.startX + dragRect.width)}
                y={Math.min(dragRect.startY, dragRect.startY + dragRect.height)}
                width={Math.abs(dragRect.width)}
                height={Math.abs(dragRect.height)}
                stroke="#1e66f5"
                strokeWidth={2}
                dash={[6, 4]}
              />
            )}

            {/* --- Doors --- */}
            {doors.map((door) => {
              const dx = denormalizeX(door.x_norm, workArea.width) + workArea.x;
              const dy = denormalizeY(door.y_norm, workArea.height) + workArea.y;
              const isSelected = selectedObjectIds.includes(door.id);
              const dWidth = 40; // Assuming a fixed door width for now
              const dStroke = door.isAiGenerated ? "#a855f7" : strokeColor;
              return (
                <Group
                  key={door.id}
                  ref={(node) => { if (node) nodeRefs.current[door.id] = node; }}
                  x={dx}
                  y={dy}
                   scaleX={door.scaleX ?? 1}
                   scaleY={door.scaleY ?? 1}
                   rotation={door.rotation}
                   draggable={!door.isConforme && !door.isLocked && currentTool === "select"}
                   listening={currentTool === "select"}
                  onTransformEnd={(e) => {
                    const node = e.target;
                    updateObjectTransform(door.id, 'door', {
                       x_norm: normalizeX(node.x() - workArea.x, workArea.width),
                       y_norm: normalizeY(node.y() - workArea.y, workArea.height),
                       scaleX: node.scaleX(),
                       scaleY: node.scaleY(),
                       rotation: node.rotation()
                    });
                  }}
                  onDragStart={(e) => {
                    commitHistory();
                    if (!selectedObjectIds.includes(door.id)) {
                      toggleSelection(door.id, e.evt.shiftKey);
                    }
                  }}
                  onDragEnd={(e) => {
                    const node = e.target;
                    updateObjectTransform(door.id, 'door', {
                      x_norm: normalizeX(node.x() - workArea.x, workArea.width),
                      y_norm: normalizeY(node.y() - workArea.y, workArea.height),
                      scaleX: node.scaleX(),
                      scaleY: node.scaleY(),
                      rotation: node.rotation()
                    });
                  }}
                  onClick={() => setSelectedObjectIds([door.id])}
                >
                  {/* Architectural Door Symbol */}
                  {/* Door leaf (rotating part) */}
                  <Line 
                    points={[0, 0, 0, -dWidth]}
                    stroke={isSelected ? "#a6e3a1" : dStroke}
                    strokeWidth={3}
                  />
                  {/* Drawing the "Swing" arc */}
                  <Path 
                    data={`M 0,-${dWidth} A ${dWidth},${dWidth} 0 0,1 ${dWidth},0`}
                    stroke={isSelected ? "#a6e3a1" : dStroke}
                    strokeWidth={1}
                    dash={[4, 4]}
                    opacity={0.6}
                  />
                  {/* Frame markers (thick "L" frames) */}
                  <Rect x={-4} y={-4} width={8} height={8} fill={dStroke} />
                  <Rect x={dWidth-4} y={-4} width={8} height={8} fill={dStroke} />
                </Group>
              );
            })}

            {/* --- Stairs --- */}
            {stairs.map((stair) => {
              const sx = denormalizeX(stair.x_norm, workArea.width) + workArea.x;
              const sy = denormalizeY(stair.y_norm, workArea.height) + workArea.y;
              const sWidth = denormalizeX(stair.width_norm, workArea.width);
              const sLength = denormalizeY(stair.length_norm, workArea.height);
              const isSelected = selectedObjectIds.includes(stair.id);
              const sStroke = stair.isAiGenerated ? "#a855f7" : strokeColor;
              
              return (
                <Group
                  key={stair.id}
                  ref={(node) => { if (node) nodeRefs.current[stair.id] = node; }}
                  x={sx}
                  y={sy}
                   scaleX={stair.scaleX ?? 1}
                   scaleY={stair.scaleY ?? 1}
                   rotation={stair.rotation}
                   draggable={!stair.isConforme && !stair.isLocked && currentTool === "select"}
                   listening={currentTool === "select"}
                  onTransformEnd={(e) => {
                    const node = e.target;
                    updateObjectTransform(stair.id, 'stair', {
                       x_norm: normalizeX(node.x() - workArea.x, workArea.width),
                       y_norm: normalizeY(node.y() - workArea.y, workArea.height),
                       scaleX: node.scaleX(),
                       scaleY: node.scaleY(),
                       rotation: node.rotation()
                    });
                  }}
                  onDragStart={(e) => {
                    commitHistory();
                    if (!selectedObjectIds.includes(stair.id)) {
                      toggleSelection(stair.id, e.evt.shiftKey);
                    }
                  }}
                  onDragEnd={(e) => {
                    const node = e.target;
                    updateObjectTransform(stair.id, 'stair', {
                      x_norm: normalizeX(node.x() - workArea.x, workArea.width),
                      y_norm: normalizeY(node.y() - workArea.y, workArea.height),
                      scaleX: node.scaleX(),
                      scaleY: node.scaleY(),
                      rotation: node.rotation()
                    });
                  }}
                  onClick={() => setSelectedObjectIds([stair.id])}
                >
                  {/* Stair Rendering */}
                  {stair.type === "straight" && (
                    <Group>
                      {/* Outline */}
                      <Rect width={sWidth} height={sLength} stroke={isSelected ? "#a6e3a1" : strokeColor} strokeWidth={2} />
                      {/* Steps */}
                      {Array.from({ length: stair.steps + 1 }).map((_, i) => (
                        <Line 
                          key={i}
                          points={[0, i * (sLength / stair.steps), sWidth, i * (sLength / stair.steps)]}
                          stroke={sStroke}
                          strokeWidth={1}
                        />
                      ))}
                      {/* Arrow */}
                      <Line points={[sWidth/2, sLength-10, sWidth/2, 10]} stroke={sStroke} strokeWidth={1} />
                      <Path data={`M ${sWidth/2-4},14 L ${sWidth/2},6 L ${sWidth/2+4},14`} stroke={sStroke} strokeWidth={1} />
                    </Group>
                  )}

                  {stair.type === "l-shape" && (
                     <Group>
                       {/* L-Shape Logic: two rectangles joined */}
                       <Rect width={sWidth} height={sLength} stroke={isSelected ? "#a6e3a1" : strokeColor} strokeWidth={2} />
                       <Rect x={sWidth} y={sLength-sWidth} width={sLength-sWidth} height={sWidth} stroke={isSelected ? "#a6e3a1" : strokeColor} strokeWidth={2} />
                       {/* Steps logic for L can be more complex, but let's start with basic lines */}
                       {Array.from({ length: stair.steps }).map((_, i) => {
                         if (i < stair.steps/2) {
                            return <Line key={i} points={[0, i*(sLength/(stair.steps/2)), sWidth, i*(sLength/(stair.steps/2))]} stroke={sStroke} strokeWidth={1} />;
                         } else {
                            const j = i - stair.steps/2;
                            return <Line key={i} points={[sWidth+j*((sLength-sWidth)/(stair.steps/2)), sLength-sWidth, sWidth+j*((sLength-sWidth)/(stair.steps/2)), sLength]} stroke={sStroke} strokeWidth={1} />;
                         }
                       })}
                     </Group>
                  )}

                  {stair.type === "u-shape" && (
                    <Group>
                      {/* U-Shape Logic: three rectangles joined */}
                      {/* First segment */}
                      <Rect width={sWidth} height={sLength} stroke={isSelected ? "#a6e3a1" : strokeColor} strokeWidth={2} />
                      {/* Connecting segment */}
                      <Rect x={sWidth} y={sLength - sWidth} width={sLength - sWidth} height={sWidth} stroke={isSelected ? "#a6e3a1" : strokeColor} strokeWidth={2} />
                      {/* Third segment */}
                      <Rect x={sLength} y={0} width={sWidth} height={sLength} stroke={isSelected ? "#a6e3a1" : strokeColor} strokeWidth={2} />
                      {/* Steps logic for U-shape */}
                      {Array.from({ length: stair.steps }).map((_, i) => {
                        const segmentLength = sLength;
                        const turnLength = sLength - sWidth;
                        const totalLength = 2 * segmentLength + turnLength;
                        const stepSize = totalLength / stair.steps;

                        if (i * stepSize < segmentLength) { // First segment
                          return <Line key={i} points={[0, i * stepSize, sWidth, i * stepSize]} stroke={sStroke} strokeWidth={1} />;
                        } else if (i * stepSize < segmentLength + turnLength) { // Connecting segment
                          const currentPos = i * stepSize - segmentLength;
                          return <Line key={i} points={[sWidth + currentPos, sLength - sWidth, sWidth + currentPos, sLength]} stroke={sStroke} strokeWidth={1} />;
                        } else { // Third segment
                          const currentPos = i * stepSize - (segmentLength + turnLength);
                          return <Line key={i} points={[sLength, sLength - currentPos, sLength + sWidth, sLength - currentPos]} stroke={sStroke} strokeWidth={1} />;
                        }
                      })}
                    </Group>
                  )}

                  {stair.type === "circular" && (
                    <Group x={sWidth} y={sWidth}>
                      {/* Outer boundary */}
                      <Ring 
                        innerRadius={sWidth * 0.4} 
                        outerRadius={sWidth} 
                        angle={270} 
                        stroke={isSelected ? "#a6e3a1" : strokeColor} 
                        strokeWidth={2}
                      />
                      {/* Steps as rays */}
                      {Array.from({ length: stair.steps }).map((_, i) => {
                        const angle = (i * 270) / stair.steps;
                        const rad = (angle * Math.PI) / 180;
                        return (
                          <Line 
                            key={i}
                            points={[
                              Math.cos(rad) * sWidth * 0.4, 
                              Math.sin(rad) * sWidth * 0.4,
                              Math.cos(rad) * sWidth,
                              Math.sin(rad) * sWidth
                            ]}
                            stroke={strokeColor}
                            strokeWidth={1}
                          />
                        );
                      })}
                    </Group>
                  )}

                  {stair.type === "arched" && (
                    <Group>
                      {/* Arched boundary */}
                      <Path 
                        data={`M 0,${sLength} L 0,${sWidth} A ${sWidth},${sWidth} 0 0,1 ${2*sWidth},${sWidth} L ${2*sWidth},${sLength}`}
                        stroke={isSelected ? "#a6e3a1" : strokeColor}
                        strokeWidth={2}
                      />
                      <Path 
                         data={`M ${sWidth/2},${sLength} L ${sWidth/2},${sWidth} A ${sWidth/2},${sWidth/2} 0 0,1 ${1.5*sWidth},${sWidth} L ${1.5*sWidth},${sLength}`}
                         stroke={strokeColor}
                         strokeWidth={1}
                      />
                      {/* Steps logic for arched */}
                      {Array.from({ length: stair.steps }).map((_, i) => {
                         // Simplify steps for now
                         const y = sLength - (i * (sLength / stair.steps));
                         if (y > sWidth) {
                           return <Line key={i} points={[0, y, sWidth/2, y]} stroke={strokeColor} strokeWidth={1} />;
                         }
                         return null;
                      })}
                    </Group>
                  )}
                </Group>
              );
            })}

            {/* --- Pins (SVG map-marker) --- */}
            {pins.map((pin) => {
              const px = denormalizeX(pin.x_norm, workArea.width) + workArea.x;
              const py = denormalizeY(pin.y_norm, workArea.height) + workArea.y;
              const isSelected = selectedObjectIds.includes(pin.id);
              return (
                <Group
                  key={pin.id}
                  ref={(node) => { if (node) nodeRefs.current[pin.id] = node; }}
                  x={px} y={py}
                  scaleX={pin.scaleX ?? 1}
                  scaleY={pin.scaleY ?? 1}
                  rotation={pin.rotation ?? 0}
                  draggable={!pin.isLocked && currentTool === "select"}
                  onTransformEnd={(e) => {
                    const node = e.target;
                    updateObjectTransform(pin.id, 'pin', {
                       x_norm: normalizeX(node.x() - workArea.x, workArea.width),
                       y_norm: normalizeY(node.y() - workArea.y, workArea.height),
                       scaleX: node.scaleX(),
                       scaleY: node.scaleY(),
                       rotation: node.rotation()
                    });
                  }}
                  onDragStart={(e) => {
                    commitHistory();
                    if (!selectedObjectIds.includes(pin.id)) {
                      toggleSelection(pin.id, e.evt.shiftKey);
                    }
                  }}
                  onDragEnd={(e) => {
                    const node = e.target;
                    updateObjectTransform(pin.id, 'pin', {
                      x_norm: normalizeX(node.x() - workArea.x, workArea.width),
                      y_norm: normalizeY(node.y() - workArea.y, workArea.height),
                      scaleX: node.scaleX(),
                      scaleY: node.scaleY(),
                      rotation: node.rotation()
                    });
                  }}
                  onClick={(e) => toggleSelection(pin.id, e.evt.shiftKey)}
                >
                  <Path
                    data={pinSvgPath}
                    fill={isSelected ? "#f38ba8" : "#f9e2af"}
                    stroke="#1e1e2e"
                    strokeWidth={2}
                  />
                </Group>
              );
            })}

            {/* --- Ghost Mode (Pending AI Changes) --- */}
            {pendingAIChanges && (
              <Group opacity={0.5}>
                {/* Pending Polygons */}
                {pendingAIChanges.polygons.map((poly) => (
                  <Line
                    key={`ghost-poly-${poly.id}`}
                    points={poly.points.flatMap(p => [
                      denormalizeX(p.x, workArea.width) + workArea.x,
                      denormalizeY(p.y, workArea.height) + workArea.y,
                    ])}
                    stroke="#a855f7"
                    strokeWidth={2}
                    dash={[5, 5]}
                    closed={true}
                    listening={false}
                  />
                ))}
                {/* Pending Doors */}
                {pendingAIChanges.doors.map((door) => (
                  <Group
                    key={`ghost-door-${door.id}`}
                    x={denormalizeX(door.x_norm, workArea.width) + workArea.x}
                    y={denormalizeY(door.y_norm, workArea.height) + workArea.y}
                    rotation={door.rotation}
                    listening={false}
                  >
                    <Line 
                      points={[0, 0, 0, -40]}
                      stroke="#a855f7"
                      strokeWidth={2}
                      dash={[3, 3]}
                    />
                    <Path 
                      data={`M 0,-40 A 40,40 0 0,1 40,0`}
                      stroke="#a855f7"
                      strokeWidth={1}
                      dash={[2, 2]}
                    />
                  </Group>
                ))}
              </Group>
            )}

            {/* --- Transformer (Handles rotation/scaling) --- */}
            {currentTool === "select" && selectedObjectIds.length > 0 && (
              <Transformer 
                ref={trRef}
                keepRatio={false}
                boundBoxFunc={(oldBox, newBox) => {
                  // Prevent scaling too small
                  if (newBox.width < 5 || newBox.height < 5) return oldBox;
                  return newBox;
                }}
              />
            )}
          </Layer>
        </Stage>
      )}
    </div>
  );
}
