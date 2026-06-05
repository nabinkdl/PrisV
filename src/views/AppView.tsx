/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import SidebarView from "./SidebarView";
import WorkspaceView from "./WorkspaceView";
import InspectorView from "./InspectorView";
import ExportModalView from "./ExportModalView";
import { AlertCircle } from "lucide-react";

import { useAppModel } from "../models/useAppModel";
import { useAppController } from "../controllers/useAppController";

export default function AppView() {
  const appModel = useAppModel();
  const appController = useAppController(appModel);

  return (
    <div
      className={`${appModel.isDarkMode ? "dark " : ""}flex flex-col h-screen w-screen overflow-hidden font-sans transition-colors duration-300 ${
        appModel.isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"
      }`}
    >
      {/* Primary Dashboard Grid split */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* 2. Left input side drawer */}
        <SidebarView
          schemaText={appModel.schemaText}
          onSchemaChange={appController.handleCustomSchemaChange}
          parsedModels={appModel.parsedModels}
          isDarkMode={appModel.isDarkMode}
          isOpen={appModel.isSidebarOpen}
          onToggle={() => appModel.setIsSidebarOpen((prev) => !prev)}
          onExportClick={() => appModel.setIsExportOpen(true)}
        />

        {/* 3. Interactive Middle Playground Board */}
        <div className="flex-1 flex flex-col items-stretch overflow-hidden relative">
          {/* Real-time Parser Error diagnostics */}
          {appModel.parserError && (
            <div className="absolute top-20 left-4 right-4 z-25 p-3.5 bg-rose-500/10 border border-rose-500/35 rounded-xl flex items-start gap-2.5 backdrop-blur-md shadow-lg">
              <AlertCircle size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-rose-500 tracking-tight">Prisma Compilation Error</h4>
                <p className="text-[10px] text-rose-400 font-mono mt-1 break-words line-clamp-3">
                  {appModel.parserError}
                </p>
              </div>
            </div>
          )}

          {/* Core canvas workspace */}
          <WorkspaceView
            models={appModel.parsedModels}
            enums={appModel.parsedEnums}
            edges={appModel.visualEdges}
            nodePositions={appModel.nodePositions}
            onNodeDrag={appController.handleNodeDrag}
            panOffset={appModel.panOffset}
            onPanOffsetChange={appModel.setPanOffset}
            zoomScale={appModel.zoomScale}
            onZoomScaleChange={appModel.setZoomScale}
            selectedModelName={appModel.selectedModelName}
            onSelectModel={appModel.setSelectedModelName}
            selectedFieldName={appModel.selectedFieldName}
            onSelectField={appModel.setSelectedFieldName}
            isDarkMode={appModel.isDarkMode}
            searchQuery={appModel.searchQuery}
            onSearchChange={appModel.setSearchQuery}
            currentPresetId={appModel.currentPresetId}
            onPresetSelect={appController.handlePresetSelect}
            onToggleTheme={() => appModel.setIsDarkMode((prev) => !prev)}
            onAutoLayout={appController.handleAutoLayoutGrid}
            onExportClick={() => appModel.setIsExportOpen(true)}
          />
        </div>

        {/* 4. Right Code Inspector Panel */}
        <InspectorView
          selectedModel={appModel.activeSelectedModel}
          selectedEnum={appModel.activeSelectedEnum}
          isDarkMode={appModel.isDarkMode}
          isOpen={appModel.isInspectorOpen}
          onToggle={() => appModel.setIsInspectorOpen((prev) => !prev)}
          selectedFieldName={appModel.selectedFieldName}
          onSelectField={appModel.setSelectedFieldName}
        />
      </div>

      {/* 5. Custom Export Modal Popup Overlay */}
      <ExportModalView
        isOpen={appModel.isExportOpen}
        onClose={() => appModel.setIsExportOpen(false)}
        schemaText={appModel.schemaText}
        models={appModel.parsedModels}
        enums={appModel.parsedEnums}
        nodePositions={appModel.nodePositions}
        isDarkMode={appModel.isDarkMode}
      />
    </div>
  );
}
