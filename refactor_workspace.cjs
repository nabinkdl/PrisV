const fs = require('fs');

let content = fs.readFileSync('src/views/WorkspaceView.tsx', 'utf-8');

// Replace imports
content = content.replace(
  'import React, { useState, useRef, useEffect } from "react";',
  'import React from "react";\nimport { useWorkspaceModel } from "../models/useWorkspaceModel";\nimport { useWorkspaceController } from "../controllers/useWorkspaceController";'
);

// Replace component declaration and state initialization up to `const getFieldVerticalOffset`
const startIndex = content.indexOf('export default function Workspace({');
const getFieldOffsetIndex = content.indexOf('  // Calculate field indices to line up heights perfectly');

if (startIndex !== -1 && getFieldOffsetIndex !== -1) {
  const headerReplacement = `export default function WorkspaceView(props: WorkspaceProps) {
  const model = useWorkspaceModel();
  const controller = useWorkspaceController({
    model,
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

`;
  content = content.substring(0, startIndex) + headerReplacement + content.substring(getFieldOffsetIndex);
}

// Remove the event handlers that are now in the controller
const screenToCanvasIndex = content.indexOf('  // Convert screen coordinates');
const returnIndex = content.indexOf('  return (\n    <div\n      ref=');

if (screenToCanvasIndex !== -1 && returnIndex !== -1) {
  const handlerCodeToRemove = content.substring(content.indexOf('  // 1. Zoom via mouse scroll wheel'), returnIndex);
  
  // Keep isRelationHighlighted, isModelFiltered, activeHoveredEdge, getFieldVerticalOffset, screenToCanvas
  // Let's just find the blocks we need to keep inside that region.
  
  const isRelationHighlightedMatch = content.match(/  \/\/ Check relationship highlights based on selected field or model\n  const isRelationHighlighted = \(edge: VisualEdge\) => {[\s\S]*?  };\n/);
  const isModelFilteredMatch = content.match(/  \/\/ Dynamic search filtering\n  const isModelFiltered = \(modelName: string\) => {[\s\S]*?  };\n/);
  const activeHoveredEdgeMatch = content.match(/  const activeHoveredEdge = edges.find\(\(e\) => e.id === hoveredEdgeId\);\n/);
  
  const newMiddleBlock = `
  // Check relationship highlights based on selected field or model
  const isRelationHighlighted = (edge: VisualEdge) => {
    if (!props.selectedFieldName || !props.selectedModelName) return false;

    const isFromFieldSelected = edge.fromModel === props.selectedModelName && edge.fromField === props.selectedFieldName;
    const isToFieldSelected = edge.toModel === props.selectedModelName && edge.toField === props.selectedFieldName;

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

  const activeHoveredEdge = props.edges.find((e) => e.id === model.hoveredEdgeId);

`;
  
  content = content.substring(0, content.indexOf('  // 1. Zoom via mouse scroll wheel')) + newMiddleBlock + content.substring(returnIndex);
}

// Now replace all state variables and props with model.* and props.*
content = content.replace(/\{containerRef\}/g, '{model.containerRef}');
content = content.replace(/ref=\{containerRef\}/g, 'ref={model.containerRef}');
content = content.replace(/isPanning/g, 'model.isPanning');
content = content.replace(/isSpacePressed/g, 'model.isSpacePressed');
content = content.replace(/draggingNode/g, 'model.draggingNode');
content = content.replace(/hoveredEdgeId/g, 'model.hoveredEdgeId');
content = content.replace(/hoveredEdgeCoords/g, 'model.hoveredEdgeCoords');
content = content.replace(/isGridSnapping/g, 'model.isGridSnapping');
content = content.replace(/setIsGridSnapping/g, 'model.setIsGridSnapping');
content = content.replace(/setHoveredEdgeId/g, 'model.setHoveredEdgeId');
content = content.replace(/setHoveredEdgeCoords/g, 'model.setHoveredEdgeCoords');

// Be careful with props
const propsList = ['models', 'enums', 'edges', 'nodePositions', 'onNodeDrag', 'panOffset', 'onPanOffsetChange', 'zoomScale', 'onZoomScaleChange', 'selectedModelName', 'onSelectModel', 'selectedFieldName', 'onSelectField', 'isDarkMode', 'searchQuery', 'onSearchChange', 'currentPresetId', 'onPresetSelect', 'onToggleTheme', 'onAutoLayout', 'onExportClick'];

propsList.forEach(prop => {
  const regex = new RegExp(`(?<!props\\.)\\b${prop}\\b`, 'g');
  // Need to avoid matching inside interface WorkspaceProps { ... }
  // So we do a targeted replace from the return statement downwards
});

let topContent = content.substring(0, content.indexOf('  return (\n'));
let bottomContent = content.substring(content.indexOf('  return (\n'));

propsList.forEach(prop => {
  const regex = new RegExp(`(?<!props\\.|model\\.)\\b${prop}\\b`, 'g');
  bottomContent = bottomContent.replace(regex, `props.${prop}`);
});

content = topContent + bottomContent;

// Replace handlers
content = content.replace(/handleMouseDown/g, 'controller.handleMouseDown');
content = content.replace(/handleDoubleClick/g, 'controller.handleDoubleClick');
content = content.replace(/handleWheel/g, 'controller.handleWheel');
content = content.replace(/handleTouchStart/g, 'controller.handleTouchStart');
content = content.replace(/handleTouchMove/g, 'controller.handleTouchMove');
content = content.replace(/handleTouchEnd/g, 'controller.handleTouchEnd');
content = content.replace(/handleNodeDragStart/g, 'controller.handleNodeDragStart');
content = content.replace(/adjustZoomCentered/g, 'controller.adjustZoomCentered');

fs.writeFileSync('src/views/WorkspaceView.tsx', content);

