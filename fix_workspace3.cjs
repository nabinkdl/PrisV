const fs = require('fs');
let content = fs.readFileSync('src/views/WorkspaceView.tsx', 'utf-8');

content = content.replace(/model\.hoveredEdgeId/g, 'wsModel.hoveredEdgeId');
content = content.replace(/model\.hoveredEdgeCoords/g, 'wsModel.hoveredEdgeCoords');

fs.writeFileSync('src/views/WorkspaceView.tsx', content);

