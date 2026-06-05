/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { PrismaModel, VisualEdge, NodePosition, PrismaEnum } from "../types";
import { Key, Link, Lock, ZoomIn, ZoomOut, Maximize, Info, Database, Search, Sun, Moon, RefreshCw, Download } from "lucide-react";
import { PRESET_SCHEMAS, PresetSchema } from "../utils/presets";

interface WorkspaceProps {
  models: PrismaModel[];
  enums?: PrismaEnum[];
  edges: VisualEdge[];
  nodePositions: Record<string, NodePosition>;
  onNodeDrag: (modelName: string, pos: NodePosition) => void;
  panOffset: NodePosition;
  onPanOffsetChange: (offset: NodePosition) => void;
  zoomScale: number;
  onZoomScaleChange: (scale: number) => void;
  selectedModelName: string | null;
  onSelectModel: (modelName: string | null) => void;
  selectedFieldName: string | null;
  onSelectField: (fieldName: string | null) => void;
  isDarkMode: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currentPresetId: string;
  onPresetSelect: (preset: PresetSchema) => void;
  onToggleTheme: () => void;
  onAutoLayout: () => void;
  onExportClick?: () => void;
}

export default function Workspace({
  models,
  enums = [],
  edges,
  nodePositions,
  onNodeDrag,
  panOffset,
  onPanOffsetChange,
  zoomScale,
  onZoomScaleChange,
  selectedModelName,
  onSelectModel,
  selectedFieldName,
  onSelectField,
  isDarkMode,
  searchQuery,
  onSearchChange,
  currentPresetId,
  onPresetSelect,
  onToggleTheme,
  onAutoLayout,
  onExportClick,
}: WorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const offsetStartRef = useRef({ x: 0, y: 0 });

  // Handle Dragging state for Nodes
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const dragStartMouseRef = useRef({ x: 0, y: 0 });
  const dragStartNodePosRef = useRef({ x: 0, y: 0 });

  // Handle Relation Hover State
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [hoveredEdgeCoords, setHoveredEdgeCoords] = useState<{ x: number; y: number } | null>(null);

  // Spacebar pan and grid snap states
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isGridSnapping, setIsGridSnapping] = useState(true);

  // Touch Handlers for Mobile Panning, Node Dragging and Pinch-to-Zoom
  const startTouchDistanceRef = useRef<number | null>(null);
  const startZoomScaleRef = useRef<number>(1);

  // Center Zoom transitions on the screen/viewport center
  const adjustZoomCentered = (newScale: number) => {
    if (!containerRef.current) {
      onZoomScaleChange(newScale);
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const canvasX = (centerX - panOffset.x) / zoomScale;
    const canvasY = (centerY - panOffset.y) / zoomScale;

    const newPanX = centerX - canvasX * newScale;
    const newPanY = centerY - canvasY * newScale;

    onZoomScaleChange(newScale);
    onPanOffsetChange({ x: newPanX, y: newPanY });
  };

  // Track key states for canvas operations (Space panning, + / - Zoom, 0 Zoom reset)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (document.activeElement as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        setIsSpacePressed(true);
      } else if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        adjustZoomCentered(Math.min(3.0, zoomScale + 0.15));
      } else if (e.key === "-") {
        e.preventDefault();
        adjustZoomCentered(Math.max(0.15, zoomScale - 0.15));
      } else if (e.key === "0") {
        e.preventDefault();
        onZoomScaleChange(1.0);
        onPanOffsetChange({ x: 30, y: 30 });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [zoomScale, panOffset, onZoomScaleChange, onPanOffsetChange]);

  // Butter-smooth document/window-level mouse drag and canvas pan listeners
  useEffect(() => {
    if (!draggingNode && !isPanning) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      // 1. Canvas Panning
      if (isPanning) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        onPanOffsetChange({
          x: offsetStartRef.current.x + dx,
          y: offsetStartRef.current.y + dy,
        });
      }

      // 2. Node Dragging
      if (draggingNode) {
        const dxPx = e.clientX - dragStartMouseRef.current.x;
        const dyPx = e.clientY - dragStartMouseRef.current.y;

        let nodeX = dragStartNodePosRef.current.x + dxPx / zoomScale;
        let nodeY = dragStartNodePosRef.current.y + dyPx / zoomScale;

        if (isGridSnapping) {
          nodeX = Math.round(nodeX / 15) * 15;
          nodeY = Math.round(nodeY / 15) * 15;
        }
        onNodeDrag(draggingNode, { x: nodeX, y: nodeY });
      }
    };

    const handleGlobalMouseUp = () => {
      setIsPanning(false);
      setDraggingNode(null);
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [draggingNode, isPanning, zoomScale, isGridSnapping, onPanOffsetChange, onNodeDrag]);

  // Constants
  const CARD_WIDTH = 260;
  const ROW_HEIGHT = 38;
  const HEADER_HEIGHT = 46;

  // Calculate field indices to line up heights perfectly
  const getFieldVerticalOffset = (model: PrismaModel, fieldName?: string) => {
    if (!fieldName) return HEADER_HEIGHT + ROW_HEIGHT / 2;
    const idx = model.fields.findIndex((f) => f.name === fieldName);
    const index = idx === -1 ? 0 : idx;
    return HEADER_HEIGHT + index * ROW_HEIGHT + ROW_HEIGHT / 2;
  };

  // Convert screen coordinates to canvas space coordinates
  const screenToCanvas = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - panOffset.x) / zoomScale,
      y: (clientY - rect.top - panOffset.y) / zoomScale,
    };
  };

  // 1. Zoom via mouse scroll wheel - centered on the mouse pointer
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate canvas coordinate under mouse before zoom
    const canvasX = (mouseX - panOffset.x) / zoomScale;
    const canvasY = (mouseY - panOffset.y) / zoomScale;

    const zoomIntensity = 0.05;
    const delta = e.deltaY < 0 ? 1 : -1;
    const newScale = Math.max(0.15, Math.min(3.0, zoomScale + delta * zoomIntensity));

    // Project canvas coordinate to new panning coordinates so it stays under mouse
    const newPanX = mouseX - canvasX * newScale;
    const newPanY = mouseY - canvasY * newScale;

    onZoomScaleChange(newScale);
    onPanOffsetChange({ x: newPanX, y: newPanY });
  };

  // 2. Mouse Panning & Node Dragging Actions
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only standard left click or middle click
    if (e.button !== 0 && e.button !== 1) return;

    const target = e.target as HTMLElement;

    // Check if the click targets or is inside interactive elements (inputs, buttons, select, etc.)
    const isUiInteractive = target.closest("button") ||
      target.closest("input") ||
      target.closest("span.cursor-pointer") ||
      target.closest("a") ||
      target.closest("select") ||
      target.closest("textarea");

    // Check if the click is on or inside a model card (node card)
    const isModelCard = target.closest('[id^="node-"]');

    const isMiddleClick = e.button === 1;
    const isSpacePan = isSpacePressed && e.button === 0;

    // Default click on board backdrop, grid, or empty parts that are not inputs/model cards is a pan space
    const isCanvasClick = !isUiInteractive && !isModelCard;

    if (isMiddleClick || isSpacePan || isCanvasClick) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY };
      offsetStartRef.current = { ...panOffset };
      if (isMiddleClick || isCanvasClick) {
        e.preventDefault(); // Stop text highlighting on pan drag
      }
    }
  };

  // Zoom on empty canvas double click: zooms in towards click position
  const handleDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isUiInteractive = target.closest("button") ||
      target.closest("input") ||
      target.closest("span.cursor-pointer") ||
      target.closest("a") ||
      target.closest("select") ||
      target.closest("textarea");

    const isModelCard = target.closest('[id^="node-"]');

    if (!isUiInteractive && !isModelCard) {
      e.preventDefault();
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const canvasX = (clickX - panOffset.x) / zoomScale;
      const canvasY = (clickY - panOffset.y) / zoomScale;

      // zoom in by 1.25x or out by 0.75x if Shift is held
      const zoomStep = e.shiftKey ? 0.75 : 1.25;
      const newScale = Math.max(0.15, Math.min(3.0, zoomScale * zoomStep));

      const newPanX = clickX - canvasX * newScale;
      const newPanY = clickY - canvasY * newScale;

      onZoomScaleChange(newScale);
      onPanOffsetChange({ x: newPanX, y: newPanY });
    }
  };

  // Touch Handlers for Mobile Panning, Node Dragging and Pinch-to-Zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const target = e.target as HTMLElement;

      const isBackground = target === e.currentTarget || target.id === "canvas-grid";

      if (isBackground) {
        setIsPanning(true);
        panStartRef.current = { x: touch.clientX, y: touch.clientY };
        offsetStartRef.current = { ...panOffset };
      } else {
        const cardParent = target.closest('[id^="node-"]');
        if (cardParent) {
          const modelName = cardParent.id.replace("node-", "");
          setDraggingNode(modelName);
          onSelectModel(modelName);

          const initialPos = nodePositions[modelName] || { x: 50, y: 50 };
          dragStartMouseRef.current = { x: touch.clientX, y: touch.clientY };
          dragStartNodePosRef.current = { ...initialPos };
        }
      }
    } else if (e.touches.length === 2) {
      setIsPanning(false);
      setDraggingNode(null);

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      startTouchDistanceRef.current = dist;
      startZoomScaleRef.current = zoomScale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (isPanning) {
        const dx = touch.clientX - panStartRef.current.x;
        const dy = touch.clientY - panStartRef.current.y;
        onPanOffsetChange({
          x: offsetStartRef.current.x + dx,
          y: offsetStartRef.current.y + dy,
        });
      } else if (draggingNode) {
        const dxPx = touch.clientX - dragStartMouseRef.current.x;
        const dyPx = touch.clientY - dragStartMouseRef.current.y;

        let nodeX = dragStartNodePosRef.current.x + dxPx / zoomScale;
        let nodeY = dragStartNodePosRef.current.y + dyPx / zoomScale;

        if (isGridSnapping) {
          nodeX = Math.round(nodeX / 15) * 15;
          nodeY = Math.round(nodeY / 15) * 15;
        }
        onNodeDrag(draggingNode, { x: nodeX, y: nodeY });
      }
    } else if (e.touches.length === 2 && startTouchDistanceRef.current !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = dist / startTouchDistanceRef.current;

      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = midX - rect.left;
        const mouseY = midY - rect.top;
        const canvasX = (mouseX - panOffset.x) / zoomScale;
        const canvasY = (mouseY - panOffset.y) / zoomScale;

        const newScale = Math.max(0.15, Math.min(3.0, startZoomScaleRef.current * ratio));

        const newPanX = mouseX - canvasX * newScale;
        const newPanY = mouseY - canvasY * newScale;

        onZoomScaleChange(newScale);
        onPanOffsetChange({ x: newPanX, y: newPanY });
      }
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    setDraggingNode(null);
    startTouchDistanceRef.current = null;
  };

  // 3. Initiate Node Drag
  const handleNodeDragStart = (e: React.MouseEvent, modelName: string) => {
    e.stopPropagation(); // Avoid triggering panning
    setDraggingNode(modelName);
    onSelectModel(modelName);

    const initialPos = nodePositions[modelName] || { x: 50, y: 50 };
    dragStartMouseRef.current = { x: e.clientX, y: e.clientY };
    dragStartNodePosRef.current = { ...initialPos };
  };

  // Check relationship highlights based on selected field or model
  const isRelationHighlighted = (edge: VisualEdge) => {
    if (!selectedFieldName || !selectedModelName) return false;

    // Direct match with selected model and field
    const isFromFieldSelected = edge.fromModel === selectedModelName && edge.fromField === selectedFieldName;
    const isToFieldSelected = edge.toModel === selectedModelName && edge.toField === selectedFieldName;

    if (isFromFieldSelected || isToFieldSelected) return true;

    // Check if the selected field is a relation property point to target models
    const sourceModel = models.find((m) => m.name === selectedModelName);
    const sourceField = sourceModel?.fields.find((f) => f.name === selectedFieldName);

    if (sourceField?.isRelationField) {
      const isLinkedModelMatched =
        (edge.fromModel === selectedModelName && edge.toModel === sourceField.baseType) ||
        (edge.toModel === selectedModelName && edge.fromModel === sourceField.baseType);
      return isLinkedModelMatched;
    }

    return false;
  };

  // Dynamic search filtering
  const isModelFiltered = (modelName: string) => {
    if (!searchQuery) return false;
    return modelName.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const activeHoveredEdge = edges.find((e) => e.id === hoveredEdgeId);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative flex-1 select-none overflow-hidden h-full outline-none ${isPanning ? "cursor-grabbing active:cursor-grabbing" : isSpacePressed ? "cursor-grab" : "cursor-default"
        } ${isDarkMode ? "bg-slate-950" : "bg-slate-50"
        }`}
    >
      {/* Sleek Floating HUD Controls */}
      <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Brand Label */}
        <div className={`p-2 px-3 rounded-xl border flex items-center gap-2 shadow-lg backdrop-blur-md pointer-events-auto select-none ${isDarkMode ? "bg-slate-900/90 border-slate-800 text-slate-100" : "bg-white/95 border-slate-200 text-slate-800"
          }`}>
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
            <Database size={15} />
          </div>
          <div>
            <h1 className="text-xs font-bold tracking-tight font-sans">PrisV</h1>
          </div>
        </div>

        {/* Dashboard Tools List */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto self-end sm:self-auto">
          {/* Model Search filter */}
          <div className="relative">
            <Search
              className="absolute left-2.5 top-2 text-slate-400"
              size={13}
            />
            <input
              id="model-search"
              type="text"
              placeholder="Filter nodes..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={`w-32 pl-8 pr-3 py-1.5 text-xs rounded-lg border outline-none font-medium shadow-md transition-all ${isDarkMode
                ? "bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:w-44"
                : "bg-white border-slate-200 text-slate-700 placeholder-slate-400 focus:border-indigo-400 focus:w-44"
                }`}
            />
          </div>

          {/* Canvas Tools container */}
          <div className={`flex items-center gap-1 border px-1 py-1 rounded-lg shadow-md backdrop-blur-md ${isDarkMode ? "bg-slate-900/95 border-slate-800" : "bg-white/95 border-slate-150"
            }`}>
            <button
              id="btn-grid-snap"
              type="button"
              onClick={() => setIsGridSnapping(!isGridSnapping)}
              title="Toggle Grid Snapping (align models neatly)"
              className={`p-1 px-1.5 rounded-md transition-all text-[11px] flex items-center gap-1 font-semibold cursor-pointer ${isGridSnapping
                ? "bg-indigo-600/15 text-indigo-500"
                : isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"
                }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isGridSnapping ? "bg-indigo-500 animate-pulse" : "bg-slate-400"}`} />
              <span>Grid Snap</span>
            </button>
            <div className="h-3.5 w-px bg-slate-150 dark:bg-slate-800 mx-0.5"></div>

            <button
              id="btn-auto-layout"
              type="button"
              onClick={onAutoLayout}
              title="Reset Layout & Coordinates"
              className={`p-1 rounded-md transition-all text-[11px] flex items-center gap-1 font-semibold cursor-pointer ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600"
                }`}
            >
              <RefreshCw size={12} />
              <span className="hidden md:inline">Reset</span>
            </button>
            <div className="h-3.5 w-px bg-slate-150 dark:bg-slate-800 mx-0.5"></div>

            <button
              id="btn-zoom-out"
              onClick={() => adjustZoomCentered(Math.max(0.15, zoomScale - 0.15))}
              title="Zoom Out"
              className={`p-1 rounded-md transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600"
                }`}
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[10px] font-mono font-bold w-9 text-center text-slate-400">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              id="btn-zoom-in"
              onClick={() => adjustZoomCentered(Math.min(3.0, zoomScale + 0.15))}
              title="Zoom In"
              className={`p-1 rounded-md transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600"
                }`}
            >
              <ZoomIn size={13} />
            </button>
            <button
              id="btn-zoom-reset"
              onClick={() => {
                onZoomScaleChange(1.0);
                onPanOffsetChange({ x: 30, y: 30 });
              }}
              title="Reset Zoom"
              className={`p-1 rounded-md transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600"
                }`}
            >
              <Maximize size={12} />
            </button>
          </div>

          {/* Theme Toggle Button */}
          <button
            id="btn-theme-toggle"
            onClick={onToggleTheme}
            title={isDarkMode ? "Light Mode" : "Dark Mode"}
            className={`p-1.5 rounded-lg border flex items-center justify-center transition-all shadow-md active:scale-95 duration-200 ${isDarkMode
              ? "bg-slate-900 border-slate-800 text-amber-400 hover:text-amber-300"
              : "bg-white border-slate-200 text-indigo-700 hover:bg-slate-50"
              }`}
          >
            {isDarkMode ? <Sun size={13} className="stroke-[2.5]" /> : <Moon size={13} className="stroke-[2.5]" />}
          </button>

          {/* New Export Button */}
          {onExportClick && (
            <button
              id="btn-export-schema"
              onClick={onExportClick}
              title="Export Schema Code, SQL script, TypeScript interfaces or JSON layout coordinates"
              className="p-1.5 px-3 rounded-lg border flex items-center gap-1.5 transition-all shadow-md active:scale-95 duration-200 cursor-pointer text-[11px] font-bold bg-indigo-600 border-indigo-600 hover:bg-indigo-500 text-white"
            >
              <Download size={13} className="stroke-[2.5]" />
              <span>Export</span>
            </button>
          )}
        </div>
      </div>

      {/* 2D Canvas Grid Overlay */}
      <div
        id="canvas-grid"
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          backgroundImage: isDarkMode
            ? "radial-gradient(rgba(71, 85, 105, 0.15) 1.5px, transparent 1.5px)"
            : "radial-gradient(rgba(148, 163, 184, 0.25) 1.5px, transparent 1.5px)",
          backgroundSize: "24px 24px",
          backgroundPosition: `${panOffset.x}px ${panOffset.y}px`,
        }}
      />

      {/* Infinite zoom pan container transformation */}
      <div
        id="transform-board"
        className="absolute top-0 left-0 w-full h-full pointer-events-none origin-top-left"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
        }}
      >
        {/* SVG Plane for drawing relational arrow paths */}
        <svg
          aria-label="Schema relations paths block"
          className="absolute inset-0 overflow-visible w-full h-full pointer-events-auto"
        >
          <defs>
            {/* Direct Arrow Markers */}
            <marker
              id="arrow-std"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill={isDarkMode ? "#6366f1" : "#4f46e5"} />
            </marker>
            <marker
              id="arrow-active"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#f59e0b" />
            </marker>
            <marker
              id="arrow-implicit"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill={isDarkMode ? "#10b981" : "#059669"} />
            </marker>
          </defs>

          {/* Render Connection Edges */}
          {edges.map((edge) => {
            const modelFrom = models.find((m) => m.name === edge.fromModel);
            const modelTo = models.find((m) => m.name === edge.toModel);
            if (!modelFrom || !modelTo) return null;

            const posA = nodePositions[edge.fromModel] || { x: 50, y: 50 };
            const posB = nodePositions[edge.toModel] || { x: 50, y: 50 };

            // Find exact vertical offsets
            const offsetA = getFieldVerticalOffset(modelFrom, edge.fromField);
            const offsetB = getFieldVerticalOffset(modelTo, edge.toField);

            const isLeftToRight = posA.x + CARD_WIDTH / 2 < posB.x + CARD_WIDTH / 2;

            // Compute connection points
            const x1 = isLeftToRight ? posA.x + CARD_WIDTH : posA.x;
            const y1 = posA.y + offsetA;

            const base_x2 = isLeftToRight ? posB.x : posB.x + CARD_WIDTH;
            const y2 = posB.y + offsetB;

            // Shorten curve slightly to align arrowhead marker correctly on node card boundary
            const x2 = isLeftToRight ? base_x2 - 8 : base_x2 + 8;

            // Bezier horizontal wave calculations
            const dx = Math.max(60, Math.min(200, Math.abs(x2 - x1) * 0.6));
            const pathData = `M ${x1} ${y1} C ${x1 + (isLeftToRight ? dx : -dx)} ${y1}, ${x2 + (isLeftToRight ? -dx : dx)
              } ${y2}, ${x2} ${y2}`;

            const isHighlighted = isRelationHighlighted(edge);
            const isHovered = hoveredEdgeId === edge.id;

            // Colors setup
            let strokeColor = isDarkMode ? "#475569" : "#cbd5e1";
            if (edge.isImplicit) {
              strokeColor = isDarkMode ? "#10b981/50" : "#10b981/70";
            }
            if (isHighlighted) {
              strokeColor = "#f59e0b"; // Golden glow for clicked links
            } else if (isHovered) {
              strokeColor = "#6366f1"; // Indigo on simple hovered elements
            }

            return (
              <g key={edge.id}>
                {/* Thick invisible interactive hover border overlay */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                  className="cursor-pointer"
                  onMouseEnter={(e) => {
                    setHoveredEdgeId(edge.id);
                    // Approximate middle coordinate
                    setHoveredEdgeCoords({
                      x: (x1 + x2) / 2,
                      y: (y1 + y2) / 2 - 10,
                    });
                  }}
                  onMouseLeave={() => {
                    setHoveredEdgeId(null);
                    setHoveredEdgeCoords(null);
                  }}
                />

                {/* Visible drawing stroke lines */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isHighlighted || isHovered ? 3.5 : 2}
                  strokeDasharray={edge.isImplicit ? "6, 4" : undefined}
                  className={`transition-all duration-300 ${isHighlighted ? "animated-pulse-line shadow-lg" : ""
                    }`}
                  markerEnd={`url(#${isHighlighted ? "arrow-active" : edge.isImplicit ? "arrow-implicit" : "arrow-std"
                    })`}
                />

                {/* Edge Label Badge */}
                {(!searchQuery || isHighlighted) && (
                  <g transform={`translate(${(x1 + x2) / 2}, ${(y1 + y2) / 2})`}>
                    <rect
                      x={-18}
                      y={-9}
                      width={36}
                      height={18}
                      rx={5}
                      fill={isDarkMode ? "#0f172a" : "#ffffff"}
                      stroke={strokeColor}
                      strokeWidth={1}
                      className="transition-colors duration-300"
                    />
                    <text
                      textAnchor="middle"
                      y={4}
                      className="font-mono text-[10px] font-bold select-none text-center"
                      fill={
                        isHighlighted
                          ? "#f59e0b"
                          : edge.isImplicit
                            ? "#10b981"
                            : isDarkMode
                              ? "#cbd5e1"
                              : "#1e293b"
                      }
                    >
                      {edge.relationType === "n-n" ? "N:N" : edge.relationType === "1-n" ? "1:N" : "1:1"}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* HTML Layer for rendering database model node cards */}
        <div id="html-nodes-container" className="absolute top-0 left-0 w-full h-full pointer-events-none">
          {models.map((model) => {
            const pos = nodePositions[model.name] || { x: 50, y: 50 };
            const isSelected = selectedModelName === model.name;
            const isDragging = draggingNode === model.name;
            const matchesSearch = searchQuery && isModelFiltered(model.name);
            const isFadeOut = searchQuery && !isModelFiltered(model.name);

            return (
              <div
                key={model.name}
                id={`node-${model.name}`}
                className={`absolute w-[260px] rounded-xl border flex flex-col pointer-events-auto select-none transition-all duration-150 ${isFadeOut ? "opacity-30 scale-95" : "opacity-100"
                  } ${isDragging
                    ? "shadow-2xl shadow-indigo-600/20 rotate-[1.5deg] scale-[1.03] z-50 ring-2 ring-indigo-500 border-indigo-505"
                    : isSelected
                      ? "ring-2 ring-indigo-500 border-indigo-500 shadow-xl shadow-indigo-500/10 z-20"
                      : matchesSearch
                        ? "ring-2 ring-amber-400 border-amber-400 animate-pulse z-25"
                        : isDarkMode
                          ? "bg-slate-900 border-slate-800 text-slate-100 hover:shadow-2xl"
                          : "bg-white border-slate-200 text-slate-800 hover:shadow-2xl"
                  }`}
                style={{
                  left: pos.x,
                  top: pos.y,
                }}
              >
                {/* Node Card Header Handle */}
                <div
                  onMouseDown={(e) => handleNodeDragStart(e, model.name)}
                  className={`px-4 py-3 rounded-t-xl border-b cursor-grab active:cursor-grabbing font-sans font-bold flex items-center justify-between transition-colors ${isDarkMode ? "bg-slate-850/65 border-slate-800" : "bg-slate-50 border-slate-150"
                    }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-indigo-500 font-mono select-none uppercase font-black">
                      table
                    </span>
                    <span className="font-semibold truncate text-[14px] text-slate-800 dark:text-slate-150">
                      {model.name}
                    </span>
                  </div>
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                </div>

                {/* Node Columns Rows list */}
                <div role="list" className="p-1.5 flex flex-col gap-0.5">
                  {model.fields.map((field) => {
                    const isFldSelected =
                      selectedFieldName === field.name && selectedModelName === model.name;

                    // Compute highlight link connections
                    let isRelatedHighlighted = false;
                    if (selectedFieldName && selectedModelName) {
                      const sourceModel = models.find((m) => m.name === selectedModelName);
                      const sourceField = sourceModel?.fields.find((f) => f.name === selectedFieldName);

                      if (sourceField) {
                        // 1. If self field matches selection
                        if (model.name === selectedModelName && field.name === selectedFieldName) {
                          isRelatedHighlighted = true;
                        }
                        // 2. If pointing foreign key points directly here
                        else if (
                          field.isForeignKey &&
                          field.fkInfo?.relatedModel === selectedModelName &&
                          field.fkInfo?.relatedField === selectedFieldName
                        ) {
                          isRelatedHighlighted = true;
                        }
                        // 3. If selected field points directly to us
                        else if (
                          sourceField.isForeignKey &&
                          sourceField.fkInfo?.relatedModel === model.name &&
                          sourceField.fkInfo?.relatedField === field.name
                        ) {
                          isRelatedHighlighted = true;
                        }
                        // 4. If selected is a relation field (e.g. author User) connected here
                        else if (sourceField.isRelationField && sourceField.baseType === model.name) {
                          if (field.isId) isRelatedHighlighted = true;
                        }
                        // 5. If we are a relation field connected to selected model
                        else if (field.isRelationField && field.baseType === selectedModelName) {
                          if (sourceField.isId) isRelatedHighlighted = true;
                        }
                      }
                    }

                    return (
                      <div
                        key={field.name}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectModel(model.name);
                          onSelectField(field.name);
                        }}
                        className={`h-[38px] px-2.5 rounded-md flex items-center justify-between text-xs cursor-pointer transition-all ${isFldSelected
                          ? "bg-indigo-600/15 border border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-bold"
                          : isRelatedHighlighted
                            ? "bg-amber-500/10 border border-amber-500/30 text-amber-500 animate-pulse font-bold"
                            : "hover:bg-slate-500/5 text-slate-700 dark:text-slate-300 border border-transparent"
                          }`}
                      >
                        {/* Name and constraints icon */}
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="flex-shrink-0 w-4 flex items-center justify-center select-none text-[10px]">
                            {field.isId ? (
                              <Key size={11} className="text-amber-500" />
                            ) : field.isForeignKey ? (
                              <Link size={11} className="text-blue-500" />
                            ) : field.isUnique ? (
                              <Lock size={11} className="text-emerald-500" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                            )}
                          </span>
                          <span className="font-mono font-medium truncate text-[11px] mr-1">
                            {field.name}
                          </span>
                          {/* KEY BADGES: PK, FK, UQ */}
                          {field.isId && (
                            <span className="shrink-0 px-1 py-[1.5px] text-[8px] leading-none font-extrabold font-mono tracking-tight rounded bg-amber-500/10 text-amber-550 border border-amber-550/20 shadow-[0_1px_2px_rgba(0,0,0,0.02)] select-none">
                              PK
                            </span>
                          )}
                          {field.isForeignKey && (
                            <span className="shrink-0 px-1 py-[1.5px] text-[8px] leading-none font-extrabold font-mono tracking-tight rounded bg-blue-500/10 text-blue-550 border border-blue-550/20 shadow-[0_1px_2px_rgba(0,0,0,0.02)] select-none">
                              FK
                            </span>
                          )}
                          {field.isUnique && (
                            <span className="shrink-0 px-1 py-[1.5px] text-[8px] leading-none font-extrabold font-mono tracking-tight rounded bg-emerald-500/10 text-emerald-550 border border-emerald-550/20 shadow-[0_1px_2px_rgba(0,0,0,0.02)] select-none">
                              UQ
                            </span>
                          )}
                        </div>

                        {/* Prisma DSL data types & decorative badges */}
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="font-mono text-[10px] text-slate-400 font-bold select-none mr-1">
                            {field.type}
                          </span>
                          <div className="flex items-center gap-1 select-none shrink-0 font-mono">
                            {field.isOptional && (
                              <span title="Optional / Nullable" className="px-1 py-[1px] leading-none text-[9px] font-bold rounded bg-slate-500/10 text-slate-400 border border-slate-500/20">
                                ?
                              </span>
                            )}
                            {field.isList && (
                              <span title="Multi-record Array / List" className="px-1 py-[1px] leading-none text-[9px] font-bold rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                []
                              </span>
                            )}
                            {field.isRelationField && !field.isForeignKey && (
                              <span title="Linked Model Connection" className="px-1 py-[1px] leading-none text-[9px] font-bold rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                rel
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {enums.map((enumItem) => {
            const pos = nodePositions[enumItem.name] || { x: 50, y: 50 };
            const isSelected = selectedModelName === enumItem.name;
            const isDragging = draggingNode === enumItem.name;
            const matchesSearch = searchQuery && isModelFiltered(enumItem.name);
            const isFadeOut = searchQuery && !isModelFiltered(enumItem.name);

            return (
              <div
                key={enumItem.name}
                id={`node-${enumItem.name}`}
                className={`absolute w-[260px] rounded-xl border flex flex-col pointer-events-auto select-none transition-all duration-150 ${isFadeOut ? "opacity-30 scale-95" : "opacity-100"
                  } ${isDragging
                    ? "shadow-2xl shadow-violet-600/20 rotate-[1.5deg] scale-[1.03] z-50 ring-2 ring-violet-500 border-violet-500"
                    : isSelected
                      ? "ring-2 ring-violet-500 border-violet-500 shadow-xl shadow-violet-500/10 z-20"
                      : matchesSearch
                        ? "ring-2 ring-amber-400 border-amber-400 animate-pulse z-25"
                        : isDarkMode
                          ? "bg-slate-900 border-slate-800 text-slate-100 hover:shadow-2xl"
                          : "bg-white border-slate-200 text-slate-800 hover:shadow-2xl"
                  }`}
                style={{
                  left: pos.x,
                  top: pos.y,
                }}
              >
                {/* Node Card Header Handle */}
                <div
                  onMouseDown={(e) => handleNodeDragStart(e, enumItem.name)}
                  className={`px-4 py-3 rounded-t-xl border-b cursor-grab active:cursor-grabbing font-sans font-bold flex items-center justify-between transition-colors ${isDarkMode ? "bg-slate-850/65 border-slate-800" : "bg-slate-50 border-slate-150"
                    }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-violet-500 font-mono select-none uppercase font-black px-1 py-[1px] leading-none rounded bg-violet-500/10 border border-violet-500/20 shadow-sm">
                      enum
                    </span>
                    <span className="font-semibold truncate text-[14px] text-slate-800 dark:text-slate-150">
                      {enumItem.name}
                    </span>
                  </div>
                  <div className="h-2.5 w-2.5 rounded-full bg-violet-400 dark:bg-violet-600" />
                </div>

                {/* Enum values rows list */}
                <div role="list" className="p-1.5 flex flex-col gap-0.5">
                  {enumItem.values.map((val) => {
                    return (
                      <div
                        key={val}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectModel(enumItem.name);
                          onSelectField(null);
                        }}
                        className={`h-[38px] px-2.5 rounded-md flex items-center justify-between text-xs cursor-pointer transition-all hover:bg-slate-500/5 text-slate-700 dark:text-slate-300 border border-transparent`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="flex-shrink-0 w-4 flex items-center justify-center select-none text-[10px]">
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 dark:bg-violet-500" />
                          </span>
                          <span className="font-mono font-medium truncate text-[11px] mr-1">
                            {val}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500 font-medium select-none uppercase">
                            VAL
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Relation Tooltip Overlay on hover */}
      {hoveredEdgeId && hoveredEdgeCoords && activeHoveredEdge && (
        <div
          id="edge-relation-tooltip"
          className={`absolute p-3 rounded-lg border shadow-xl z-50 text-[11px] font-mono leading-tight max-w-sm pointer-events-none divide-y divide-slate-700/10 transition-opacity duration-200 ${isDarkMode
            ? "bg-slate-900/95 border-emerald-500/30 text-slate-200"
            : "bg-white/95 border-indigo-500/20 text-slate-700"
            }`}
          style={{
            left: hoveredEdgeCoords.x * zoomScale + panOffset.x,
            top: hoveredEdgeCoords.y * zoomScale + panOffset.y,
            transform: "translate(-50%, -100%) translateY(-10px)",
          }}
        >
          <div className="font-bold font-sans text-indigo-600 dark:text-indigo-400 pb-1 flex items-center gap-1">
            <Info size={12} />
            <span>Relation Directives</span>
          </div>
          <div className="pt-1.5 space-y-1 font-medium select-text">
            <p>
              <strong className="text-slate-400">Source:</strong> {activeHoveredEdge.fromModel}.
              {activeHoveredEdge.fromField}
            </p>
            <p>
              <strong className="text-slate-400">Target:</strong> {activeHoveredEdge.toModel}.
              {activeHoveredEdge.toField}
            </p>
            <p className="font-semibold text-emerald-500 pt-0.5">
              💡 {activeHoveredEdge.rawRelationText}
            </p>
          </div>
        </div>
      )}

      {/* Empty States Instructions if 0 models are displayed */}
      {models.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-900/5 backdrop-blur-[1px] z-10 pointer-events-none">
          <div className="p-4 rounded-xl bg-indigo-500/10 max-w-sm pointer-events-auto">
            <ZoomIn size={32} className="mx-auto mb-2 text-indigo-500 animate-bounce" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              Empty Schema Canvas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              No database models detected. Please paste your custom DSL code, pick a preset schema,
              or load a <code className="font-mono text-indigo-400">schema.prisma</code> template file.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
