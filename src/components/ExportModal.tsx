/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useMemo } from "react";
import { PrismaModel, PrismaEnum, NodePosition } from "../types";
import { X, Download, Copy, Check, FileCode, CheckSquare, Terminal, Database, FileJson, Info } from "lucide-react";
import { generateFullSQL, generateFullTypeScript } from "../utils/exportHelpers";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  schemaText: string;
  models: PrismaModel[];
  enums: PrismaEnum[];
  nodePositions: Record<string, NodePosition>;
  isDarkMode: boolean;
}

type ExportTab = "prisma" | "sql" | "typescript" | "layout";

export default function ExportModal({
  isOpen,
  onClose,
  schemaText,
  models,
  enums,
  nodePositions,
  isDarkMode,
}: ExportModalProps) {
  const [activeTab, setActiveTab] = useState<ExportTab>("prisma");
  const [copied, setCopied] = useState(false);

  const sqlCode = useMemo(() => {
    return generateFullSQL(models, enums);
  }, [models, enums]);

  const tsCode = useMemo(() => {
    return generateFullTypeScript(models, enums);
  }, [models, enums]);

  const jsonLayout = useMemo(() => {
    return JSON.stringify(
      {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        modelsCount: models.length,
        enumsCount: enums.length,
        canvasState: {
          nodePositions,
        },
        schemaPrisma: schemaText,
        parsedStructure: {
          models,
          enums,
        }
      },
      null,
      2
    );
  }, [models, enums, nodePositions, schemaText]);

  const currentCode = useMemo(() => {
    switch (activeTab) {
      case "prisma":
        return schemaText || "// No Prisma schema code present to export.";
      case "sql":
        return sqlCode;
      case "typescript":
        return tsCode;
      case "layout":
        return jsonLayout;
      default:
        return "";
    }
  }, [activeTab, schemaText, sqlCode, tsCode, jsonLayout]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const handleDownload = () => {
    let filename = "schema.prisma";
    let mimeType = "text/plain";

    if (activeTab === "sql") {
      filename = "schema.sql";
      mimeType = "application/sql";
    } else if (activeTab === "typescript") {
      filename = "schema.ts";
      mimeType = "application/typescript";
    } else if (activeTab === "layout") {
      filename = "prisma-layout.json";
      mimeType = "application/json";
    }

    const blob = new Blob([currentCode], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card content */}
      <div 
        className={`relative w-full max-w-3xl h-[85vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all duration-300 transform scale-100 ${
          isDarkMode 
            ? "bg-slate-900 border-slate-800 text-slate-100" 
            : "bg-white border-slate-200 text-slate-800"
        }`}
      >
        {/* Header section */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 px-1.5 rounded-md bg-indigo-600 text-white shadow-md">
              <Download size={15} />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-tight font-sans">
                Export Schema & Diagram
              </h2>
              <p className="text-[10px] text-slate-400">Download source code or layout metadata</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-all ${
              isDarkMode 
                ? "border-slate-800 hover:bg-slate-800 text-slate-400" 
                : "border-slate-200 hover:bg-slate-100 text-slate-500"
            }`}
          >
            <X size={14} />
          </button>
        </div>

        {/* Tab switcher options */}
        <div className={`px-4 py-2 border-b flex flex-wrap items-center justify-between gap-2 ${
          isDarkMode ? "border-slate-800 bg-slate-950/40" : "border-slate-150 bg-slate-50/50"
        }`}>
          <div className="flex items-center gap-1.5 overflow-x-auto select-none">
            <button
              onClick={() => setActiveTab("prisma")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "prisma"
                  ? "bg-indigo-600 text-white shadow-md"
                  : isDarkMode
                  ? "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <FileCode size={13} />
              <span>schema.prisma</span>
            </button>

            <button
              onClick={() => setActiveTab("sql")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "sql"
                  ? "bg-indigo-600 text-white shadow-md"
                  : isDarkMode
                  ? "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Database size={13} />
              <span>PostgreSQL SQL</span>
            </button>

            <button
              onClick={() => setActiveTab("typescript")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "typescript"
                  ? "bg-indigo-600 text-white shadow-md"
                  : isDarkMode
                  ? "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Terminal size={13} />
              <span>TypeScript Types</span>
            </button>

            <button
              onClick={() => setActiveTab("layout")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "layout"
                  ? "bg-indigo-600 text-white shadow-md"
                  : isDarkMode
                  ? "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <FileJson size={13} />
              <span>Layout JSON</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                isDarkMode 
                  ? "border-slate-800 hover:bg-slate-800 text-slate-300" 
                  : "border-slate-200 hover:bg-slate-100 text-slate-600"
              }`}
            >
              {copied ? (
                <>
                  <Check size={13} className="text-emerald-500 animate-bounce" />
                  <span className="text-emerald-500 font-extrabold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white shadow-md active:scale-95"
            >
              <Download size={13} />
              <span>Download File</span>
            </button>
          </div>
        </div>

        {/* Code Content Preview Window */}
        <div className="flex-1 min-h-0 bg-slate-950/95 relative">
          <pre className="absolute inset-0 p-4 font-mono text-[11px] leading-relaxed select-text overflow-auto text-indigo-200 dark:text-emerald-300">
            {currentCode}
          </pre>
        </div>

        {/* Informational footer line */}
        <div className={`p-3 text-[10px] text-center border-t flex items-center justify-center gap-1.5 font-medium ${
          isDarkMode 
            ? "border-slate-800 bg-slate-950/20 text-slate-400" 
            : "border-slate-150 bg-slate-50 text-slate-500"
        }`}>
          <Info size={11} className="text-indigo-500 shrink-0" />
          <span>
            {activeTab === "prisma" && "Prisma file structure is compliant with Schema DSL v3.0."}
            {activeTab === "sql" && "SQL generator auto-includes schema enum mappings and foreign key links."}
            {activeTab === "typescript" && "TypeScript interfaces matches native types mapped structure."}
            {activeTab === "layout" && "Importing this JSON file recovers exact layout coordinates of all nodes!"}
          </span>
        </div>
      </div>
    </div>
  );
}
