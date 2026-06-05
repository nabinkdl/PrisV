import React, { useEffect } from "react";
import { useWorkspaceModel } from "../models/useWorkspaceModel";
import { NodePosition } from "../types";

interface WorkspaceControllerProps {
  model: ReturnType<typeof useWorkspaceModel>;
  zoomScale: number;
  onZoomScaleChange: (scale: number) => void;
  panOffset: NodePosition;
  onPanOffsetChange: (offset: NodePosition) => void;
  onNodeDrag: (modelName: string, pos: NodePosition) => void;
  onSelectModel: (modelName: string | null) => void;
  nodePositions: Record<string, NodePosition>;
}

export function useWorkspaceController({
  model,
  zoomScale,
  onZoomScaleChange,
  panOffset,
  onPanOffsetChange,
  onNodeDrag,
  onSelectModel,
  nodePositions,
}: WorkspaceControllerProps) {

  const adjustZoomCentered = (newScale: number) => {
    if (!model.containerRef.current) {
      onZoomScaleChange(newScale);
      return;
    }
    const rect = model.containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const canvasX = (centerX - panOffset.x) / zoomScale;
    const canvasY = (centerY - panOffset.y) / zoomScale;

    const newPanX = centerX - canvasX * newScale;
    const newPanY = centerY - canvasY * newScale;

    onZoomScaleChange(newScale);
    onPanOffsetChange({ x: newPanX, y: newPanY });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (document.activeElement as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        model.setIsSpacePressed(true);
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
        model.setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [zoomScale, panOffset, onZoomScaleChange, onPanOffsetChange]);

  useEffect(() => {
    if (!model.draggingNode && !model.isPanning) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (model.isPanning) {
        const dx = e.clientX - model.panStartRef.current.x;
        const dy = e.clientY - model.panStartRef.current.y;
        onPanOffsetChange({
          x: model.offsetStartRef.current.x + dx,
          y: model.offsetStartRef.current.y + dy,
        });
      }

      if (model.draggingNode) {
        const dxPx = e.clientX - model.dragStartMouseRef.current.x;
        const dyPx = e.clientY - model.dragStartMouseRef.current.y;

        let nodeX = model.dragStartNodePosRef.current.x + dxPx / zoomScale;
        let nodeY = model.dragStartNodePosRef.current.y + dyPx / zoomScale;

        if (model.isGridSnapping) {
          nodeX = Math.round(nodeX / 15) * 15;
          nodeY = Math.round(nodeY / 15) * 15;
        }
        onNodeDrag(model.draggingNode, { x: nodeX, y: nodeY });
      }
    };

    const handleGlobalMouseUp = () => {
      model.setIsPanning(false);
      model.setDraggingNode(null);
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [model.draggingNode, model.isPanning, zoomScale, model.isGridSnapping, onPanOffsetChange, onNodeDrag]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!model.containerRef.current) return;

    const rect = model.containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const canvasX = (mouseX - panOffset.x) / zoomScale;
    const canvasY = (mouseY - panOffset.y) / zoomScale;

    const zoomIntensity = 0.05;
    const delta = e.deltaY < 0 ? 1 : -1;
    const newScale = Math.max(0.15, Math.min(3.0, zoomScale + delta * zoomIntensity));

    const newPanX = mouseX - canvasX * newScale;
    const newPanY = mouseY - canvasY * newScale;

    onZoomScaleChange(newScale);
    onPanOffsetChange({ x: newPanX, y: newPanY });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;

    const target = e.target as HTMLElement;

    const isUiInteractive = target.closest("button") ||
      target.closest("input") ||
      target.closest("span.cursor-pointer") ||
      target.closest("a") ||
      target.closest("select") ||
      target.closest("textarea");

    const isModelCard = target.closest('[id^="node-"]');

    const isMiddleClick = e.button === 1;
    const isSpacePan = model.isSpacePressed && e.button === 0;

    const isCanvasClick = !isUiInteractive && !isModelCard;

    if (isMiddleClick || isSpacePan || isCanvasClick) {
      model.setIsPanning(true);
      model.panStartRef.current = { x: e.clientX, y: e.clientY };
      model.offsetStartRef.current = { ...panOffset };
      if (isMiddleClick || isCanvasClick) {
        e.preventDefault();
      }
    }
  };

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
      if (!model.containerRef.current) return;
      const rect = model.containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const canvasX = (clickX - panOffset.x) / zoomScale;
      const canvasY = (clickY - panOffset.y) / zoomScale;

      const zoomStep = e.shiftKey ? 0.75 : 1.25;
      const newScale = Math.max(0.15, Math.min(3.0, zoomScale * zoomStep));

      const newPanX = clickX - canvasX * newScale;
      const newPanY = clickY - canvasY * newScale;

      onZoomScaleChange(newScale);
      onPanOffsetChange({ x: newPanX, y: newPanY });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const target = e.target as HTMLElement;

      const isBackground = target === e.currentTarget || target.id === "canvas-grid";

      if (isBackground) {
        model.setIsPanning(true);
        model.panStartRef.current = { x: touch.clientX, y: touch.clientY };
        model.offsetStartRef.current = { ...panOffset };
      } else {
        const cardParent = target.closest('[id^="node-"]');
        if (cardParent) {
          const modelName = cardParent.id.replace("node-", "");
          model.setDraggingNode(modelName);
          onSelectModel(modelName);

          const initialPos = nodePositions[modelName] || { x: 50, y: 50 };
          model.dragStartMouseRef.current = { x: touch.clientX, y: touch.clientY };
          model.dragStartNodePosRef.current = { ...initialPos };
        }
      }
    } else if (e.touches.length === 2) {
      model.setIsPanning(false);
      model.setDraggingNode(null);

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      model.startTouchDistanceRef.current = dist;
      model.startZoomScaleRef.current = zoomScale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (model.isPanning) {
        const dx = touch.clientX - model.panStartRef.current.x;
        const dy = touch.clientY - model.panStartRef.current.y;
        onPanOffsetChange({
          x: model.offsetStartRef.current.x + dx,
          y: model.offsetStartRef.current.y + dy,
        });
      } else if (model.draggingNode) {
        const dxPx = touch.clientX - model.dragStartMouseRef.current.x;
        const dyPx = touch.clientY - model.dragStartMouseRef.current.y;

        let nodeX = model.dragStartNodePosRef.current.x + dxPx / zoomScale;
        let nodeY = model.dragStartNodePosRef.current.y + dyPx / zoomScale;

        if (model.isGridSnapping) {
          nodeX = Math.round(nodeX / 15) * 15;
          nodeY = Math.round(nodeY / 15) * 15;
        }
        onNodeDrag(model.draggingNode, { x: nodeX, y: nodeY });
      }
    } else if (e.touches.length === 2 && model.startTouchDistanceRef.current !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = dist / model.startTouchDistanceRef.current;

      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;

      if (model.containerRef.current) {
        const rect = model.containerRef.current.getBoundingClientRect();
        const mouseX = midX - rect.left;
        const mouseY = midY - rect.top;
        const canvasX = (mouseX - panOffset.x) / zoomScale;
        const canvasY = (mouseY - panOffset.y) / zoomScale;

        const newScale = Math.max(0.15, Math.min(3.0, model.startZoomScaleRef.current * ratio));

        const newPanX = mouseX - canvasX * newScale;
        const newPanY = mouseY - canvasY * newScale;

        onZoomScaleChange(newScale);
        onPanOffsetChange({ x: newPanX, y: newPanY });
      }
    }
  };

  const handleTouchEnd = () => {
    model.setIsPanning(false);
    model.setDraggingNode(null);
    model.startTouchDistanceRef.current = null;
  };

  const handleNodeDragStart = (e: React.MouseEvent, modelName: string) => {
    e.stopPropagation();
    model.setDraggingNode(modelName);
    onSelectModel(modelName);

    const initialPos = nodePositions[modelName] || { x: 50, y: 50 };
    model.dragStartMouseRef.current = { x: e.clientX, y: e.clientY };
    model.dragStartNodePosRef.current = { ...initialPos };
  };

  return {
    adjustZoomCentered,
    handleWheel,
    handleMouseDown,
    handleDoubleClick,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleNodeDragStart
  };
}
