import { useState, useMemo, useEffect } from "react";
import { parsePrismaSchema, deriveVisualEdges } from "../utils/prismaParser";
import { PRESET_SCHEMAS } from "../utils/presets";
import { PrismaModel, NodePosition, PrismaEnum } from "../types";

export function computeGridLayout(models: PrismaModel[], enums: PrismaEnum[] = []): Record<string, NodePosition> {
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

export function useAppModel() {
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

  const [selectedModelName, setSelectedModelName] = useState<string | null>(null);
  const [selectedFieldName, setSelectedFieldName] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem("prisviz_dark_mode");
    return stored !== null ? stored === "true" : true;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(true);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const { parsedModels, parsedEnums, parserError } = useMemo(() => {
    try {
      const { models, enums } = parsePrismaSchema(schemaText);
      return { parsedModels: models, parsedEnums: enums, parserError: null as string | null };
    } catch (err: any) {
      return { parsedModels: [], parsedEnums: [], parserError: err?.message || "An error occurred while parsing the schema." };
    }
  }, [schemaText]);

  const visualEdges = useMemo(() => {
    return deriveVisualEdges(parsedModels);
  }, [parsedModels]);

  useEffect(() => {
    if (parsedModels.length === 0 && parsedEnums.length === 0) return;

    setNodePositions((prev) => {
      const validNames = new Set([...parsedModels.map(m => m.name), ...parsedEnums.map(e => e.name)]);
      const hasUnpositionedModel = parsedModels.some((m) => !prev[m.name]);
      const hasUnpositionedEnum = parsedEnums.some((e) => !prev[e.name]);
      const hasOrphanedNodes = Object.keys(prev).some(key => !validNames.has(key));

      if (hasUnpositionedModel || hasUnpositionedEnum || hasOrphanedNodes) {
        const freshGrid = computeGridLayout(parsedModels, parsedEnums);
        const mergedGrid = { ...freshGrid };
        Object.keys(prev).forEach((key) => {
          if (validNames.has(key)) {
            mergedGrid[key] = prev[key];
          }
        });
        return mergedGrid;
      }
      return prev;
    });
  }, [parsedModels, parsedEnums]);

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

  const activeSelectedModel = useMemo(() => {
    if (!selectedModelName) return null;
    return parsedModels.find((m) => m.name === selectedModelName) || null;
  }, [selectedModelName, parsedModels]);

  const activeSelectedEnum = useMemo(() => {
    if (!selectedModelName) return null;
    return parsedEnums.find((e) => e.name === selectedModelName) || null;
  }, [selectedModelName, parsedEnums]);

  return {
    currentPresetId, setCurrentPresetId,
    schemaText, setSchemaText,
    nodePositions, setNodePositions,
    panOffset, setPanOffset,
    zoomScale, setZoomScale,
    selectedModelName, setSelectedModelName,
    selectedFieldName, setSelectedFieldName,
    searchQuery, setSearchQuery,
    isDarkMode, setIsDarkMode,
    isSidebarOpen, setIsSidebarOpen,
    isInspectorOpen, setIsInspectorOpen,
    isExportOpen, setIsExportOpen,
    parsedModels, parsedEnums, parserError, visualEdges,
    activeSelectedModel, activeSelectedEnum
  };
}
