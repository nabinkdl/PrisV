const fs = require('fs');
let content = fs.readFileSync('src/views/WorkspaceView.tsx', 'utf-8');

// Fix interface
content = content.replace(/props\.zoomScale: number;/g, 'zoomScale: number;');

// Fix controller initialization keys
content = content.replace(/props\.zoomScale: props\.zoomScale/g, 'zoomScale: props.zoomScale');
content = content.replace(/props\.onZoomScaleChange: props\.onZoomScaleChange/g, 'onZoomScaleChange: props.onZoomScaleChange');
content = content.replace(/props\.panOffset: props\.panOffset/g, 'panOffset: props.panOffset');
content = content.replace(/props\.onPanOffsetChange: props\.onPanOffsetChange/g, 'onPanOffsetChange: props.onPanOffsetChange');
content = content.replace(/props\.onNodeDrag: props\.onNodeDrag/g, 'onNodeDrag: props.onNodeDrag');
content = content.replace(/props\.onSelectModel: props\.onSelectModel/g, 'onSelectModel: props.onSelectModel');
content = content.replace(/props\.nodePositions: props\.nodePositions/g, 'nodePositions: props.nodePositions');

fs.writeFileSync('src/views/WorkspaceView.tsx', content);

