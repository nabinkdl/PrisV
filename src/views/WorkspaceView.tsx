
import React from "react";
import { useWorkspaceModel } from "../models/useWorkspaceModel";
import { useWorkspaceController } from "../controllers/useWorkspaceController";
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

export default function WorkspaceView(props: WorkspaceProps) {
  const wsModel = useWorkspaceModel();
  const controller = useWorkspaceController({
    model: wsModel,
    zoomScale: props.zoomScale,
    onZoomScaleChange: props.onZoomScaleChange,
    panOffset: props.panOffset,
    onPanOffsetChange: props.onPanOffsetChange,
    onNodeDrag: props.onNodeDrag,
    onSelectModel: props.onSelectModel,
    nodePositions: props.nodePositions,
  });

  // Constants
  const CARD_WIDTH = 260;
  const ROW_HEIGHT = 38;
  const HEADER_HEIGHT = 46;

  // Calculate field indices to line up heights perfectly
  const getFieldVerticalOffset = (model: PrismaModel, fieldName?: string) => {
    if (!fieldName) return HEADER_HEIGHT + 25;
    const idx = model.fields.findIndex((f) => f.name === fieldName);
    const index = idx === -1 ? 0 : idx;
    return HEADER_HEIGHT + 25 + index * 40;
  };

  // Check relationship highlights based on selected field or model
  const isRelationHighlighted = (edge: VisualEdge) => {
    if (!props.selectedFieldName || !props.selectedModelName) return false;

    const isFromFieldSelected = edge.fromModel === props.selectedModelName && edge.fromField.split(", ").includes(props.selectedFieldName);
    const isToFieldSelected = edge.toModel === props.selectedModelName && edge.toField.split(", ").includes(props.selectedFieldName);

    if (isFromFieldSelected || isToFieldSelected) return true;

    const sourceModel = props.models.find((m) => m.name === props.selectedModelName);
    const sourceField = sourceModel?.fields.find((f) => f.name === props.selectedFieldName);

    if (sourceField?.isRelationField) {
      const isLinkedModelMatched =
        (edge.fromModel === props.selectedModelName && edge.toModel === sourceField.baseType) ||
        (edge.toModel === props.selectedModelName && edge.fromModel === sourceField.baseType);
      return isLinkedModelMatched;
    }

    return false;
  };

  // Dynamic search filtering
  const isModelFiltered = (modelName: string) => {
    if (!props.searchQuery) return false;
    return modelName.toLowerCase().includes(props.searchQuery.toLowerCase());
  };

  const activeHoveredEdge = props.edges.find((e) => e.id === wsModel.hoveredEdgeId);

  return (
    <div
      ref={wsModel.containerRef}
      onMouseDown={controller.handleMouseDown}
      onDoubleClick={controller.handleDoubleClick}
      onWheel={controller.handleWheel}
      onTouchStart={controller.handleTouchStart}
      onTouchMove={controller.handleTouchMove}
      onTouchEnd={controller.handleTouchEnd}
      className={`relative flex-1 select-none overflow-hidden h-full outline-none ${wsModel.isPanning ? "cursor-grabbing active:cursor-grabbing" : wsModel.isSpacePressed ? "cursor-grab" : "cursor-default"
        } ${props.isDarkMode ? "bg-slate-950" : "bg-slate-50"
        }`}
    >
      {/* Sleek Floating HUD Controls */}
      <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Brand Label */}
        <div className={`p-2 px-3 rounded-xl border flex items-center gap-2 shadow-lg backdrop-blur-md pointer-events-auto select-none ${props.isDarkMode ? "bg-slate-900/90 border-slate-800 text-slate-100" : "bg-white/95 border-slate-200 text-slate-800"
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
              value={props.searchQuery}
              onChange={(e) => props.onSearchChange(e.target.value)}
              className={`w-32 pl-8 pr-3 py-1.5 text-xs rounded-lg border outline-none font-medium shadow-md transition-all ${props.isDarkMode
                ? "bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:w-44"
                : "bg-white border-slate-200 text-slate-700 placeholder-slate-400 focus:border-indigo-400 focus:w-44"
                }`}
            />
          </div>

          {/* Canvas Tools container */}
          <div className={`flex items-center gap-1 border px-1 py-1 rounded-lg shadow-md backdrop-blur-md ${props.isDarkMode ? "bg-slate-900/95 border-slate-800" : "bg-white/95 border-slate-150"
            }`}>
            <button
              id="btn-grid-snap"
              type="button"
              onClick={() => wsModel.setIsGridSnapping(!wsModel.isGridSnapping)}
              title="Toggle Grid Snapping (align props.models neatly)"
              className={`p-1 px-1.5 rounded-md transition-all text-[11px] flex items-center gap-1 font-semibold cursor-pointer ${wsModel.isGridSnapping
                ? "bg-indigo-600/15 text-indigo-500"
                : props.isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"
                }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${wsModel.isGridSnapping ? "bg-indigo-500 animate-pulse" : "bg-slate-400"}`} />
              <span>Grid Snap</span>
            </button>
            <div className="h-3.5 w-px bg-slate-150 dark:bg-slate-800 mx-0.5"></div>

            <button
              id="btn-auto-layout"
              type="button"
              onClick={props.onAutoLayout}
              title="Reset Layout & Coordinates"
              className={`p-1 rounded-md transition-all text-[11px] flex items-center gap-1 font-semibold cursor-pointer ${props.isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600"
                }`}
            >
              <RefreshCw size={12} />
              <span className="hidden md:inline">Reset</span>
            </button>
            <div className="h-3.5 w-px bg-slate-150 dark:bg-slate-800 mx-0.5"></div>

            <button
              id="btn-zoom-out"
              onClick={() => controller.adjustZoomCentered(Math.max(0.15, props.zoomScale - 0.15))}
              title="Zoom Out"
              className={`p-1 rounded-md transition-colors ${props.isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600"
                }`}
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[10px] font-mono font-bold w-9 text-center text-slate-400">
              {Math.round(props.zoomScale * 100)}%
            </span>
            <button
              id="btn-zoom-in"
              onClick={() => controller.adjustZoomCentered(Math.min(3.0, props.zoomScale + 0.15))}
              title="Zoom In"
              className={`p-1 rounded-md transition-colors ${props.isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600"
                }`}
            >
              <ZoomIn size={13} />
            </button>
            <button
              id="btn-zoom-reset"
              onClick={() => {
                props.onZoomScaleChange(1.0);
                props.onPanOffsetChange({ x: 30, y: 30 });
              }}
              title="Reset Zoom"
              className={`p-1 rounded-md transition-colors ${props.isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600"
                }`}
            >
              <Maximize size={12} />
            </button>
          </div>

          {/* Theme Toggle Button */}
          <button
            id="btn-theme-toggle"
            onClick={props.onToggleTheme}
            title={props.isDarkMode ? "Light Mode" : "Dark Mode"}
            className={`p-1.5 rounded-lg border flex items-center justify-center transition-all shadow-md active:scale-95 duration-200 ${props.isDarkMode
              ? "bg-slate-900 border-slate-800 text-amber-400 hover:text-amber-300"
              : "bg-white border-slate-200 text-indigo-700 hover:bg-slate-50"
              }`}
          >
            {props.isDarkMode ? <Sun size={13} className="stroke-[2.5]" /> : <Moon size={13} className="stroke-[2.5]" />}
          </button>

          {/* New Export Button */}
          {props.onExportClick && (
            <button
              id="btn-export-schema"
              onClick={props.onExportClick}
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
          backgroundImage: props.isDarkMode
            ? "radial-gradient(rgba(71, 85, 105, 0.15) 1.5px, transparent 1.5px)"
            : "radial-gradient(rgba(148, 163, 184, 0.25) 1.5px, transparent 1.5px)",
          backgroundSize: "24px 24px",
          backgroundPosition: `${props.panOffset.x}px ${props.panOffset.y}px`,
        }}
      />

      {/* Infinite zoom pan container transformation */}
      <div
        id="transform-board"
        className="absolute top-0 left-0 w-full h-full pointer-events-none origin-top-left"
        style={{
          transform: `translate(${props.panOffset.x}px, ${props.panOffset.y}px) scale(${props.zoomScale})`,
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
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill={props.isDarkMode ? "#6366f1" : "#4f46e5"} />
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
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill={props.isDarkMode ? "#10b981" : "#059669"} />
            </marker>
          </defs>

          {/* Render Connection Edges */}
          {props.edges.map((edge) => {
            const modelFrom = props.models.find((m) => m.name === edge.fromModel);
            const modelTo = props.models.find((m) => m.name === edge.toModel);
            if (!modelFrom || !modelTo) return null;

            const posA = props.nodePositions[edge.fromModel] || { x: 50, y: 50 };
            const posB = props.nodePositions[edge.toModel] || { x: 50, y: 50 };

            // Find exact vertical offsets
            const offsetA = getFieldVerticalOffset(modelFrom, edge.fromField.split(", ")[0]);
            const offsetB = getFieldVerticalOffset(modelTo, edge.toField.split(", ")[0]);

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
            const isHovered = wsModel.hoveredEdgeId === edge.id;

            // Colors setup
            let strokeColor = props.isDarkMode ? "#475569" : "#cbd5e1";
            if (edge.isImplicit) {
              strokeColor = props.isDarkMode ? "#10b981/50" : "#10b981/70";
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
                    wsModel.setHoveredEdgeId(edge.id);
                    // Approximate middle coordinate
                    wsModel.setHoveredEdgeCoords({
                      x: (x1 + x2) / 2,
                      y: (y1 + y2) / 2 - 10,
                    });
                  }}
                  onMouseLeave={() => {
                    wsModel.setHoveredEdgeId(null);
                    wsModel.setHoveredEdgeCoords(null);
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
                {(!props.searchQuery || isHighlighted) && (
                  <g transform={`translate(${(x1 + x2) / 2}, ${(y1 + y2) / 2})`}>
                    <rect
                      x={-18}
                      y={-9}
                      width={36}
                      height={18}
                      rx={5}
                      fill={props.isDarkMode ? "#0f172a" : "#ffffff"}
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
                            : props.isDarkMode
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
          {props.models.map((model) => {
            const pos = props.nodePositions[model.name] || { x: 50, y: 50 };
            const isSelected = props.selectedModelName === model.name;
            const isDragging = wsModel.draggingNode === model.name;
            const matchesSearch = props.searchQuery && isModelFiltered(model.name);
            const isFadeOut = props.searchQuery && !isModelFiltered(model.name);

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
                        : props.isDarkMode
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
                  onMouseDown={(e) => controller.handleNodeDragStart(e, model.name)}
                  className={`px-4 py-3 rounded-t-xl border-b cursor-grab active:cursor-grabbing font-sans font-bold flex items-center justify-between transition-colors ${props.isDarkMode ? "bg-slate-850/65 border-slate-800" : "bg-slate-50 border-slate-150"
                    }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-indigo-500 font-mono select-none uppercase font-black">
                      table
                    </span>
                    <span className="font-semibold truncate text-[14px] text-slate-800 dark:text-slate-300">
                      {model.name}
                    </span>
                  </div>
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                </div>

                {/* Node Columns Rows list */}
                <div role="list" className="p-1.5 flex flex-col gap-0.5">
                  {model.fields.map((field) => {
                    const isFldSelected =
                      props.selectedFieldName === field.name && props.selectedModelName === model.name;

                    // Compute highlight link connections
                    let isRelatedHighlighted = false;
                    if (props.selectedFieldName && props.selectedModelName) {
                      const sourceModel = props.models.find((m) => m.name === props.selectedModelName);
                      const sourceField = sourceModel?.fields.find((f) => f.name === props.selectedFieldName);

                      if (sourceField) {
                        // 1. If self field matches selection
                        if (model.name === props.selectedModelName && field.name === props.selectedFieldName) {
                          isRelatedHighlighted = true;
                        }
                        // 2. If pointing foreign key points directly here
                        else if (
                          field.isForeignKey &&
                          field.fkInfo?.relatedModel === props.selectedModelName &&
                          field.fkInfo?.relatedField === props.selectedFieldName
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
                        else if (field.isRelationField && field.baseType === props.selectedModelName) {
                          if (sourceField.isId) isRelatedHighlighted = true;
                        }
                      }
                    }

                    return (
                      <div
                        key={field.name}
                        onClick={(e) => {
                          e.stopPropagation();
                          props.onSelectModel(model.name);
                          props.onSelectField(field.name);
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

          {(props.enums || []).map((enumItem) => {
            const pos = props.nodePositions[enumItem.name] || { x: 50, y: 50 };
            const isSelected = props.selectedModelName === enumItem.name;
            const isDragging = wsModel.draggingNode === enumItem.name;
            const matchesSearch = props.searchQuery && isModelFiltered(enumItem.name);
            const isFadeOut = props.searchQuery && !isModelFiltered(enumItem.name);

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
                        : props.isDarkMode
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
                  onMouseDown={(e) => controller.handleNodeDragStart(e, enumItem.name)}
                  className={`px-4 py-3 rounded-t-xl border-b cursor-grab active:cursor-grabbing font-sans font-bold flex items-center justify-between transition-colors ${props.isDarkMode ? "bg-slate-850/65 border-slate-800" : "bg-slate-50 border-slate-150"
                    }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-violet-500 font-mono select-none uppercase font-black px-1 py-[1px] leading-none rounded bg-violet-500/10 border border-violet-500/20 shadow-sm">
                      enum
                    </span>
                    <span className="font-semibold truncate text-[14px] text-slate-800 dark:text-orange-300">
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
                          props.onSelectModel(enumItem.name);
                          props.onSelectField(null);
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
      {wsModel.hoveredEdgeId && wsModel.hoveredEdgeCoords && activeHoveredEdge && (
        <div
          id="edge-relation-tooltip"
          className={`absolute p-3 rounded-lg border shadow-xl z-50 text-[11px] font-mono leading-tight max-w-sm pointer-events-none divide-y divide-slate-700/10 transition-opacity duration-200 ${props.isDarkMode
            ? "bg-slate-900/95 border-emerald-500/30 text-slate-200"
            : "bg-white/95 border-indigo-500/20 text-slate-700"
            }`}
          style={{
            left: wsModel.hoveredEdgeCoords.x * props.zoomScale + props.panOffset.x,
            top: wsModel.hoveredEdgeCoords.y * props.zoomScale + props.panOffset.y,
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

      {/* Empty States Instructions if 0 props.models are displayed */}
      {props.models.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-900/5 backdrop-blur-[1px] z-10 pointer-events-none">
          <div className="p-4 rounded-xl bg-indigo-500/10 max-w-sm pointer-events-auto">
            <ZoomIn size={32} className="mx-auto mb-2 text-indigo-500 animate-bounce" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              Empty Schema Canvas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              No database props.models detected. Please paste your custom DSL code, pick a preset schema,
              or load a <code className="font-mono text-indigo-400">schema.prisma</code> template file.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
