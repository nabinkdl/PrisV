const fs = require('fs');

let content = fs.readFileSync('src/views/WorkspaceView.tsx', 'utf-8');

// 1. Rename `const model = useWorkspaceModel();` to `const wsModel = useWorkspaceModel();`
content = content.replace('const model = useWorkspaceModel();', 'const wsModel = useWorkspaceModel();');

// 2. Change `model: model` or `model,` to `model: wsModel,` in controller instantiation
content = content.replace('    model,', '    model: wsModel,');

// 3. Fix the activeHoveredEdge
content = content.replace('model.model.hoveredEdgeId', 'wsModel.hoveredEdgeId');
content = content.replace('model.hoveredEdgeId', 'wsModel.hoveredEdgeId');

// 4. Fix screenToCanvas
content = content.replace('if (!containerRef.current)', 'if (!wsModel.containerRef.current)');
content = content.replace('const rect = containerRef.current.getBoundingClientRect();', 'const rect = wsModel.containerRef.current.getBoundingClientRect();');
content = content.replace('panOffset.x', 'props.panOffset.x');
content = content.replace('panOffset.y', 'props.panOffset.y');
content = content.replace(/zoomScale/g, 'props.zoomScale'); // Inside screenToCanvas

// 5. Replace `model.containerRef`, `model.isPanning`, `model.isSpacePressed`, `model.draggingNode`, `model.isGridSnapping`, `model.setHoveredEdgeId`, `model.setHoveredEdgeCoords`
content = content.replace(/model\.containerRef/g, 'wsModel.containerRef');
content = content.replace(/model\.isPanning/g, 'wsModel.isPanning');
content = content.replace(/model\.isSpacePressed/g, 'wsModel.isSpacePressed');
content = content.replace(/model\.draggingNode/g, 'wsModel.draggingNode');
content = content.replace(/model\.isGridSnapping/g, 'wsModel.isGridSnapping');
content = content.replace(/model\.setIsGridSnapping/g, 'wsModel.setIsGridSnapping');
content = content.replace(/model\.setHoveredEdgeId/g, 'wsModel.setHoveredEdgeId');
content = content.replace(/model\.setHoveredEdgeCoords/g, 'wsModel.setHoveredEdgeCoords');

// 6. Fix `props.props.` if it exists
content = content.replace(/props\.props\./g, 'props.');

fs.writeFileSync('src/views/WorkspaceView.tsx', content);

