const fs = require('fs');

// 1. Update index.css
let css = fs.readFileSync('src/index.css', 'utf-8');
if (!css.includes('@custom-variant dark')) {
  css = css.replace('@import "tailwindcss";', '@import "tailwindcss";\n\n@custom-variant dark (&:is(.dark *));');
  fs.writeFileSync('src/index.css', css);
}

// 2. Update AppView.tsx
let appView = fs.readFileSync('src/views/AppView.tsx', 'utf-8');
if (!appView.includes('${appModel.isDarkMode ? "dark " : ""}')) {
  appView = appView.replace(
    'className={`flex flex-col h-screen',
    'className={`${appModel.isDarkMode ? "dark " : ""}flex flex-col h-screen'
  );
  fs.writeFileSync('src/views/AppView.tsx', appView);
}

// 3. Update WorkspaceView.tsx mutually exclusive ternaries
let wsView = fs.readFileSync('src/views/WorkspaceView.tsx', 'utf-8');

// For models
wsView = wsView.replace(
  /} \${isDragging\n\s+\? "shadow-2xl shadow-indigo-600\/20 rotate-\[1\.5deg\] scale-\[1\.03\] z-50 ring-2 ring-indigo-500 border-indigo-505"\n\s+: isSelected\n\s+\? "ring-2 ring-indigo-500 border-indigo-500 shadow-xl shadow-indigo-500\/10 z-20"\n\s+: matchesSearch\n\s+\? "ring-2 ring-amber-400 border-amber-400 animate-pulse z-25"\n\s+: props\.isDarkMode\n\s+\? "bg-slate-900 border-slate-800 text-slate-100 hover:shadow-2xl"\n\s+: "bg-white border-slate-200 text-slate-800 hover:shadow-2xl"\n\s+}`}/,
  `} ${props.isDarkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"} ${
    isDragging ? "shadow-2xl shadow-indigo-600/20 rotate-[1.5deg] scale-[1.03] z-50 ring-2 ring-indigo-500 border-indigo-500"
    : isSelected ? "ring-2 ring-indigo-500 border-indigo-500 shadow-xl shadow-indigo-500/10 z-20 hover:shadow-2xl"
    : matchesSearch ? "ring-2 ring-amber-400 border-amber-400 animate-pulse z-25 hover:shadow-2xl"
    : "hover:shadow-2xl"
  }\`}`
);

// For enums
wsView = wsView.replace(
  /} \${isDragging\n\s+\? "shadow-2xl shadow-violet-600\/20 rotate-\[1\.5deg\] scale-\[1\.03\] z-50 ring-2 ring-violet-500 border-violet-500"\n\s+: isSelected\n\s+\? "ring-2 ring-violet-500 border-violet-500 shadow-xl shadow-violet-500\/10 z-20"\n\s+: matchesSearch\n\s+\? "ring-2 ring-amber-400 border-amber-400 animate-pulse z-25"\n\s+: props\.isDarkMode\n\s+\? "bg-slate-900 border-slate-800 text-slate-100 hover:shadow-2xl"\n\s+: "bg-white border-slate-200 text-slate-800 hover:shadow-2xl"\n\s+}`}/,
  `} ${props.isDarkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"} ${
    isDragging ? "shadow-2xl shadow-violet-600/20 rotate-[1.5deg] scale-[1.03] z-50 ring-2 ring-violet-500 border-violet-500"
    : isSelected ? "ring-2 ring-violet-500 border-violet-500 shadow-xl shadow-violet-500/10 z-20 hover:shadow-2xl"
    : matchesSearch ? "ring-2 ring-amber-400 border-amber-400 animate-pulse z-25 hover:shadow-2xl"
    : "hover:shadow-2xl"
  }\`}`
);

// 4. Fix bg-slate-850 to bg-slate-800 (Tailwind doesn't have 850 by default)
wsView = wsView.replace(/bg-slate-850\/65/g, "bg-slate-800/80");

fs.writeFileSync('src/views/WorkspaceView.tsx', wsView);

