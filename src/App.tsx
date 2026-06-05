/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Workspace from "./components/Workspace";
import Inspector from "./components/Inspector";
import ExportModal from "./components/ExportModal";
import { parsePrismaSchema, deriveVisualEdges } from "./utils/prismaParser";
import { PRESET_SCHEMAS, PresetSchema } from "./utils/presets";
import { PrismaModel, NodePosition, PrismaEnum } from "./types";
import { AlertCircle, HelpCircle, PanelLeftClose, PanelRightClose, Github, RefreshCw } from "lucide-react";

/**
 * Arranges the list of database models into a pristine rectangular/square grid
 * to minimize overlapping and maximize clean, readable alignment.
 */
function computeGridLayout(models: PrismaModel[], enums: PrismaEnum[] = []): Record<string, NodePosition> {
  const positions: Record<string, NodePosition> = {};
  const totalCount = models.length + enums.length;
  if (totalCount === 0) return positions;

  const spacingX = 380;
  const spacingY = 320;
  const cols = Math.ceil(Math.sqrt(totalCount)); // Rectangular grid auto-match

  models.forEach((model, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    positions[model.name] = {
      x: col * spacingX + 80,
      y: row * spacingY + 80,
    };
  });

  enums.forEach((enumItem, index) => {
    const overallIndex = models.length + index;
    const col = overallIndex % cols;
    const row = Math.floor(overallIndex / cols);
    positions[enumItem.name] = {
      x: col * spacingX + 80,
      y: row * spacingY + 80,
    };
  });

  return positions;
}

export default function App() {
  // Load state from localStorage with fallback defaults
  const [currentPresetId, setCurrentPresetId] = useState<string>(() => {
    return localStorage.getItem("prisviz_preset_id") || "blog";
  });
  const [schemaText, setSchemaText] = useState<string>(() => {
    return localStorage.getItem("prisviz_schema_text") || PRESET_SCHEMAS[0].code;
  });
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>(() => {
    try {
      const stored = localStorage.getItem("prisviz_node_positions");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Canvas zoom and translate coordinates offset
  const [panOffset, setPanOffset] = useState<NodePosition>(() => {
    try {
      const stored = localStorage.getItem("prisviz_pan_offset");
      return stored ? JSON.parse(stored) : { x: 20, y: 20 };
    } catch {
      return { x: 20, y: 20 };
    }
  });
  const [zoomScale, setZoomScale] = useState<number>(() => {
    const stored = localStorage.getItem("prisviz_zoom_scale");
    return stored ? Number(stored) : 0.9;
  });

  // Focus selection variables
  const [selectedModelName, setSelectedModelName] = useState<string | null>(null);
  const [selectedFieldName, setSelectedFieldName] = useState<string | null>(null);

  // Search filtering state
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Appearance & Drawer Panel view states
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem("prisviz_dark_mode");
    return stored !== null ? stored === "true" : true;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(true);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Parse schema dynamically on schema change
  const { parsedModels, parsedEnums, parserError } = useMemo(() => {
    try {
      const { models, enums } = parsePrismaSchema(schemaText);
      return { parsedModels: models, parsedEnums: enums, parserError: null as string | null };
    } catch (err: any) {
      return { parsedModels: [], parsedEnums: [], parserError: err?.message || "An error occurred while parsing the schema." };
    }
  }, [schemaText]);

  // Derive connection lines
  const visualEdges = useMemo(() => {
    return deriveVisualEdges(parsedModels);
  }, [parsedModels]);

  // Auto layout nodes to coordinate grid when:
  // - A preset is newly loaded
  // - The computed models list has models with undefined positions.
  useEffect(() => {
    if (parsedModels.length === 0 && parsedEnums.length === 0) return;

    // Check if we need to layout (if any parsed model or enum doesn't have a coordinate registered)
    const hasUnpositionedModel = parsedModels.some((m) => !nodePositions[m.name]);
    const hasUnpositionedEnum = parsedEnums.some((e) => !nodePositions[e.name]);
    if (hasUnpositionedModel || hasUnpositionedEnum) {
      const freshGrid = computeGridLayout(parsedModels, parsedEnums);
      setNodePositions((prev) => {
        const mergedGrid = { ...freshGrid };
        // Prefer existing coordinates for models/enums already positioned
        Object.keys(prev).forEach((key) => {
          if (parsedModels.some((m) => m.name === key) || parsedEnums.some((e) => e.name === key)) {
            mergedGrid[key] = prev[key];
          }
        });
        return mergedGrid;
      });
    }
  }, [parsedModels, parsedEnums]);

  // Sync state attributes to localStorage
  useEffect(() => {
    localStorage.setItem("prisviz_preset_id", currentPresetId);
  }, [currentPresetId]);

  useEffect(() => {
    localStorage.setItem("prisviz_schema_text", schemaText);
  }, [schemaText]);

  useEffect(() => {
    localStorage.setItem("prisviz_node_positions", JSON.stringify(nodePositions));
  }, [nodePositions]);

  useEffect(() => {
    localStorage.setItem("prisviz_pan_offset", JSON.stringify(panOffset));
  }, [panOffset]);

  useEffect(() => {
    localStorage.setItem("prisviz_zoom_scale", String(zoomScale));
  }, [zoomScale]);

  useEffect(() => {
    localStorage.setItem("prisviz_dark_mode", String(isDarkMode));
  }, [isDarkMode]);

  // Command handlers
  const handlePresetSelect = (preset: PresetSchema) => {
    setCurrentPresetId(preset.id);
    setSchemaText(preset.code);
    setSelectedModelName(null);
    setSelectedFieldName(null);

    // Compute layout for the new preset models and enums instantly
    const { models: freshModels, enums: freshEnums } = parsePrismaSchema(preset.code);
    const freshGrid = computeGridLayout(freshModels, freshEnums);
    setNodePositions(freshGrid);

    // Center canvas zoom offset
    setPanOffset({ x: 50, y: 50 });
    setZoomScale(0.95);
  };

  const handleCustomSchemaChange = (newVal: string) => {
    setCurrentPresetId("custom");
    setSchemaText(newVal);
  };

  const handleNodeDrag = (modelName: string, newPos: NodePosition) => {
    setNodePositions((prev) => ({
      ...prev,
      [modelName]: newPos,
    }));
  };

  const handleAutoLayoutGrid = () => {
    if (parsedModels.length === 0 && parsedEnums.length === 0) return;
    const freshGrid = computeGridLayout(parsedModels, parsedEnums);
    setNodePositions(freshGrid);
    setPanOffset({ x: 40, y: 40 });
    setZoomScale(0.95);
  };

  const handleZoomIn = () => {
    setZoomScale((z) => Math.min(3.0, z + 0.1));
  };

  const handleZoomOut = () => {
    setZoomScale((z) => Math.max(0.15, z - 0.1));
  };

  const handleZoomReset = () => {
    setZoomScale(1.0);
    setPanOffset({ x: 30, y: 30 });
  };

  // Inspect the active focused model details
  const activeSelectedModel = useMemo(() => {
    if (!selectedModelName) return null;
    return parsedModels.find((m) => m.name === selectedModelName) || null;
  }, [selectedModelName, parsedModels]);

  // Inspect the active focused enum details
  const activeSelectedEnum = useMemo(() => {
    if (!selectedModelName) return null;
    return parsedEnums.find((e) => e.name === selectedModelName) || null;
  }, [selectedModelName, parsedEnums]);

  return (
    <div
      className={`flex flex-col h-screen w-screen overflow-hidden font-sans transition-colors duration-300 ${
        isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"
      }`}
    >
      {/* Primary Dashboard Grid split */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* 2. Left input side drawer */}
        <Sidebar
          schemaText={schemaText}
          onSchemaChange={handleCustomSchemaChange}
          parsedModels={parsedModels}
          isDarkMode={isDarkMode}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((prev) => !prev)}
          onExportClick={() => setIsExportOpen(true)}
        />

        {/* 3. Interactive Middle Playground Board */}
        <div className="flex-1 flex flex-col items-stretch overflow-hidden relative">
          {/* Real-time Parser Error diagnostics (shifted down to not collide with HUD controls) */}
          {parserError && (
            <div className="absolute top-20 left-4 right-4 z-25 p-3.5 bg-rose-500/10 border border-rose-500/35 rounded-xl flex items-start gap-2.5 backdrop-blur-md shadow-lg">
              <AlertCircle size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-rose-500 tracking-tight">Prisma Compilation Error</h4>
                <p className="text-[10px] text-rose-400 font-mono mt-1 break-words line-clamp-3">
                  {parserError}
                </p>
              </div>
            </div>
          )}

          {/* Core canvas workspace */}
          <Workspace
            models={parsedModels}
            enums={parsedEnums}
            edges={visualEdges}
            nodePositions={nodePositions}
            onNodeDrag={handleNodeDrag}
            panOffset={panOffset}
            onPanOffsetChange={setPanOffset}
            zoomScale={zoomScale}
            onZoomScaleChange={setZoomScale}
            selectedModelName={selectedModelName}
            onSelectModel={setSelectedModelName}
            selectedFieldName={selectedFieldName}
            onSelectField={setSelectedFieldName}
            isDarkMode={isDarkMode}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            currentPresetId={currentPresetId}
            onPresetSelect={handlePresetSelect}
            onToggleTheme={() => setIsDarkMode((prev) => !prev)}
            onAutoLayout={handleAutoLayoutGrid}
            onExportClick={() => setIsExportOpen(true)}
          />
        </div>

        {/* 4. Right Code Inspector Panel */}
        <Inspector
          selectedModel={activeSelectedModel}
          selectedEnum={activeSelectedEnum}
          isDarkMode={isDarkMode}
          isOpen={isInspectorOpen}
          onToggle={() => setIsInspectorOpen((prev) => !prev)}
          selectedFieldName={selectedFieldName}
          onSelectField={setSelectedFieldName}
        />
      </div>

      {/* 5. Custom Export Modal Popup Overlay */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        schemaText={schemaText}
        models={parsedModels}
        enums={parsedEnums}
        nodePositions={nodePositions}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
