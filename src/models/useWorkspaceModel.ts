import { useState, useRef } from "react";
import { NodePosition } from "../types";

export function useWorkspaceModel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<NodePosition>({ x: 0, y: 0 });
  const offsetStartRef = useRef<NodePosition>({ x: 0, y: 0 });

  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const dragStartMouseRef = useRef<NodePosition>({ x: 0, y: 0 });
  const dragStartNodePosRef = useRef<NodePosition>({ x: 0, y: 0 });

  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [hoveredEdgeCoords, setHoveredEdgeCoords] = useState<NodePosition | null>(null);

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isGridSnapping, setIsGridSnapping] = useState(true);

  const startTouchDistanceRef = useRef<number | null>(null);
  const startZoomScaleRef = useRef<number>(1);

  return {
    containerRef,
    isPanning, setIsPanning,
    panStartRef, offsetStartRef,
    draggingNode, setDraggingNode,
    dragStartMouseRef, dragStartNodePosRef,
    hoveredEdgeId, setHoveredEdgeId,
    hoveredEdgeCoords, setHoveredEdgeCoords,
    isSpacePressed, setIsSpacePressed,
    isGridSnapping, setIsGridSnapping,
    startTouchDistanceRef, startZoomScaleRef,
  };
}
