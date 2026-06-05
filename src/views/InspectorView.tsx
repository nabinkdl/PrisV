
import React, { useState } from "react";
import { PrismaModel, PrismaEnum } from "../types";
import { modelToSQL, modelToTypeScript } from "../utils/generators";
import { Code, FileCode, Check, Copy, Info, Database, AlertCircle, ChevronLeft, ChevronRight, Key, Link } from "lucide-react";

interface InspectorProps {
  selectedModel: PrismaModel | null;
  selectedEnum?: PrismaEnum | null;
  isDarkMode: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onSelectField: (fieldName: string | null) => void;
  selectedFieldName: string | null;
}

export default function Inspector({
  selectedModel,
  selectedEnum,
  isDarkMode,
  isOpen,
  onToggle,
  onSelectField,
  selectedFieldName,
}: InspectorProps) {
  const [activeTab, setActiveTab] = useState<"specs" | "typescript" | "sql">("specs");
  const [copied, setCopied] = useState(false);

  // Quick Copy command helper
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tsCode = selectedModel ? modelToTypeScript(selectedModel) : "";
  const sqlCode = selectedModel ? modelToSQL(selectedModel) : "";

  return (
    <div className="relative flex h-full">
      {/* Drawer Toggle Handle */}
      <button
        id="btn-inspector-toggle"
        onClick={onToggle}
        title={isOpen ? "Collapse Inspector" : "Expand Inspector"}
        className={`absolute top-1/2 -left-4 -translate-y-1/2 w-4 h-16 rounded-l-lg flex items-center justify-center border-y border-l shadow-md z-40 cursor-pointer hover:bg-indigo-600 hover:text-white transition-all ${isDarkMode
            ? "bg-slate-100 border-slate-800 text-slate-400"
            : "bg-indigo-300 border-slate-200 text-slate-500"
          }`}
      >
        {isOpen ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Inspector drawer panel */}
      <div
        id="inspector-panel"
        className={`transition-all duration-300 h-full flex flex-col border-l shadow-md z-30 ${isOpen ? "w-[360px] opacity-100" : "w-0 opacity-0 overflow-hidden pointer-events-none"
          } ${isDarkMode
            ? "bg-slate-900 border-slate-800 text-slate-100"
            : "bg-slate-50 border-slate-200 text-slate-800"
          }`}
      >
        {selectedModel ? (
          <div className="flex-1 flex flex-col h-full min-h-0">
            {/* Model title banner */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="text-indigo-500" size={18} />
                <div>
                  <h2 className="font-bold text-sm tracking-tight font-sans">
                    model <span className="text-indigo-550 dark:text-indigo-400">{selectedModel.name}</span>
                  </h2>
                  <p className="text-[10px] text-slate-400">Database Table Inspector</p>
                </div>
              </div>
            </div>

            {/* In-Panel Tab bars */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs text-center font-semibold">
              <button
                id="tab-specs"
                onClick={() => setActiveTab("specs")}
                className={`flex-1 py-3 transition-colors border-b-2 ${activeTab === "specs"
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-500"
                    : "border-transparent text-slate-400 hover:text-slate-500 dark:hover:text-slate-350"
                  }`}
              >
                Field Design
              </button>
              <button
                id="tab-typescript"
                onClick={() => setActiveTab("typescript")}
                className={`flex-1 py-3 transition-colors border-b-2 ${activeTab === "typescript"
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-550"
                    : "border-transparent text-slate-400 hover:text-slate-500 dark:hover:text-slate-350"
                  }`}
              >
                Typescript
              </button>
              <button
                id="tab-sql"
                onClick={() => setActiveTab("sql")}
                className={`flex-1 py-3 transition-colors border-b-2 ${activeTab === "sql"
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-550"
                    : "border-transparent text-slate-400 hover:text-slate-500 dark:hover:text-slate-350"
                  }`}
              >
                SQL DDL
              </button>
            </div>

            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {activeTab === "specs" && (
                <div className="space-y-4">
                  {/* Model description statistics */}
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2.5 rounded-lg bg-slate-500/5 border border-slate-300/10">
                      <p className="text-[10px] text-slate-400">Total Fields</p>
                      <p className="text-lg font-mono font-bold text-indigo-500">
                        {selectedModel.fields.length}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-500/5 border border-slate-300/10">
                      <p className="text-[10px] text-slate-400">Relations</p>
                      <p className="text-lg font-mono font-bold text-violet-500">
                        {selectedModel.fields.filter((f) => f.isRelationField).length}
                      </p>
                    </div>
                  </div>

                  {/* List of structural fields */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Database Columns
                    </p>
                    <div className="space-y-1">
                      {selectedModel.fields.map((field) => {
                        const isSelected = selectedFieldName === field.name;
                        return (
                          <div
                            key={field.name}
                            onClick={() => onSelectField(field.name)}
                            className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${isSelected
                                ? "bg-indigo-600/10 border-indigo-500/40"
                                : "hover:bg-slate-500/5 border-transparent"
                              }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-mono font-semibold truncate text-[12px]">
                                {field.name}
                              </span>
                              {field.isId && (
                                <span className="bg-amber-500/10 text-amber-400 text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 border border-amber-500/20">
                                  <Key size={10} /> PK
                                </span>
                              )}
                              {field.isForeignKey && (
                                <span className="bg-blue-500/10 text-blue-400 text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 border border-blue-500/20">
                                  <Link size={10} /> FK
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[11px] text-slate-400 font-medium">
                              {field.type}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Model level constraints */}
                  {selectedModel.attributes.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Block Attributes
                      </p>
                      <div className="space-y-1">
                        {selectedModel.attributes.map((attr, idx) => (
                          <pre
                            key={idx}
                            className="bg-slate-950/45 p-2 rounded-lg font-mono text-[10px] text-slate-400 overflow-x-auto"
                          >
                            {attr}
                          </pre>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "typescript" && (
                <div className="space-y-3 h-full flex flex-col min-h-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                      TypeScript Interface
                    </p>
                    <button
                      id="btn-copy-ts"
                      onClick={() => handleCopyText(tsCode)}
                      className="text-[10px] font-semibold text-slate-400 hover:text-indigo-500 flex items-center gap-1 transition-colors border px-1.5 py-0.5 rounded"
                    >
                      {copied ? (
                        <>
                          <Check size={12} className="text-emerald-500" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={11} /> Copy String
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="bg-slate-950/80 p-3 rounded-xl font-mono text-[11px] text-indigo-300 overflow-auto flex-1 min-h-[250px] leading-relaxed">
                    {tsCode}
                  </pre>
                </div>
              )}

              {activeTab === "sql" && (
                <div className="space-y-3 h-full flex flex-col min-h-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">SQL DDL Schema</p>
                    <button
                      id="btn-copy-sql"
                      onClick={() => handleCopyText(sqlCode)}
                      className="text-[10px] font-semibold text-slate-400 hover:text-indigo-500 flex items-center gap-1 transition-colors border px-1.5 py-0.5 rounded"
                    >
                      {copied ? (
                        <>
                          <Check size={12} className="text-emerald-500" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={11} /> Copy SQL
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="bg-slate-950/80 p-3 rounded-xl font-mono text-[11px] text-emerald-400 overflow-auto flex-1 min-h-[250px] leading-relaxed">
                    {sqlCode}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ) : selectedEnum ? (
          <div className="flex-1 flex flex-col h-full min-h-0">
            {/* Enum title banner */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="text-violet-500" size={18} />
                <div>
                  <h2 className="font-bold text-sm tracking-tight font-sans">
                    enum <span className="text-violet-550 dark:text-violet-400">{selectedEnum.name}</span>
                  </h2>
                  <p className="text-[10px] text-slate-400">Database Enum Inspector</p>
                </div>
              </div>
            </div>

            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0 space-y-4">
              <div className="p-2.5 rounded-lg bg-slate-500/5 border border-slate-300/10 text-center">
                <p className="text-[10px] text-slate-400">Total Enum Values</p>
                <p className="text-lg font-mono font-bold text-violet-500">
                  {selectedEnum.values.length}
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Enum Values
                </p>
                <div className="space-y-1">
                  {selectedEnum.values.map((val) => (
                    <div
                      key={val}
                      className="p-2 rounded-lg border border-transparent bg-slate-500/5 text-xs font-mono font-medium flex items-center justify-between"
                    >
                      <span>{val}</span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.05em] px-1.5 py-0.5 rounded bg-slate-500/10">Value</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generated typescript enum */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">TypeScript TSX Equivalent</p>
                  <button
                    id="btn-copy-enum"
                    onClick={() => handleCopyText(`export enum ${selectedEnum.name} {\n${selectedEnum.values.map(v => `  ${v} = "${v}",`).join("\n")}\n}`)}
                    className="text-[10px] font-semibold text-slate-400 hover:text-indigo-500 flex items-center gap-1 transition-colors border px-1.5 py-0.5 rounded"
                  >
                    {copied ? (
                      <>
                        <Check size={12} className="text-emerald-500" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={11} /> Copy Code
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-slate-950/80 p-3 rounded-xl font-mono text-[11px] text-violet-300 overflow-auto leading-relaxed">
                  {`export enum ${selectedEnum.name} {
${selectedEnum.values.map(v => `  ${v} = "${v}",`).join("\n")}
}`}
                </pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <div className="p-4 rounded-full bg-slate-500/5 mb-3">
              <Info size={32} className="text-indigo-400/70" />
            </div>
            <h3 className="font-bold text-sm tracking-tight text-slate-300 dark:text-slate-400">
              No Model Selected
            </h3>
            <p className="text-[11px] mt-1 text-slate-500 max-w-xs leading-relaxed">
              Click any database model card or enum in the workspace graph canvas to inspect
              columns, associations, and SQL creation codes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
