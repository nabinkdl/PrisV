import { PresetSchema } from "../utils/presets";
import { NodePosition } from "../types";
import { parsePrismaSchema } from "../utils/prismaParser";
import { computeGridLayout, useAppModel } from "../models/useAppModel";

export function useAppController(model: ReturnType<typeof useAppModel>) {
  const handlePresetSelect = (preset: PresetSchema) => {
    model.setCurrentPresetId(preset.id);
    model.setSchemaText(preset.code);
    model.setSelectedModelName(null);
    model.setSelectedFieldName(null);

    const { models: freshModels, enums: freshEnums } = parsePrismaSchema(preset.code);
    const freshGrid = computeGridLayout(freshModels, freshEnums);
    model.setNodePositions(freshGrid);

    model.setPanOffset({ x: 50, y: 50 });
    model.setZoomScale(0.95);
  };

  const handleCustomSchemaChange = (newVal: string) => {
    model.setCurrentPresetId("custom");
    model.setSchemaText(newVal);
  };

  const handleNodeDrag = (modelName: string, newPos: NodePosition) => {
    model.setNodePositions((prev) => ({
      ...prev,
      [modelName]: newPos,
    }));
  };

  const handleAutoLayoutGrid = () => {
    if (model.parsedModels.length === 0 && model.parsedEnums.length === 0) return;
    const freshGrid = computeGridLayout(model.parsedModels, model.parsedEnums);
    model.setNodePositions(freshGrid);
    model.setPanOffset({ x: 40, y: 40 });
    model.setZoomScale(0.95);
  };

  return {
    handlePresetSelect,
    handleCustomSchemaChange,
    handleNodeDrag,
    handleAutoLayoutGrid,
  };
}
