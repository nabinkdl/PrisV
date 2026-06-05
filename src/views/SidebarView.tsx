
import React, { useState, useRef } from "react";
import { Upload, Download, FileCode, Check, AlertCircle, HelpCircle, ChevronLeft, ChevronRight, BookOpen, Trash2, Key, Lock, Link, ChevronDown, ChevronUp } from "lucide-react";
import { PrismaModel } from "../types";
import { formatPrismaSchema, highlightPrismaLine } from "../utils/prismaFormatter";

interface SidebarProps {
  schemaText: string;
  onSchemaChange: (val: string) => void;
  parsedModels: PrismaModel[];
  isDarkMode: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onExportClick?: () => void;
}

export default function Sidebar({
  schemaText,
  onSchemaChange,
  parsedModels,
  isDarkMode,
  isOpen,
  onToggle,
  onExportClick,
}: SidebarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [isResizing, setIsResizing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const confirmTimeoutRef = useRef<number | null>(null);

  const [copied, setCopied] = useState(false);
  const highlightOuterRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightOuterRef.current) {
      highlightOuterRef.current.scrollTop = e.currentTarget.scrollTop;
      highlightOuterRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  React.useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) {
        window.clearTimeout(confirmTimeoutRef.current);
      }
    };
  }, []);

  const handleClearClick = () => {
    if (!schemaText.trim()) return;
    if (showClearConfirm) {
      onSchemaChange("");
      setShowClearConfirm(false);
      if (confirmTimeoutRef.current) {
        window.clearTimeout(confirmTimeoutRef.current);
        confirmTimeoutRef.current = null;
      }
    } else {
      setShowClearConfirm(true);
      confirmTimeoutRef.current = window.setTimeout(() => {
        setShowClearConfirm(false);
      }, 4000);
    }
  };

  // Drag-resize helper for sidebar
  const startResizing = React.useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizing(true);
  }, []);

  React.useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate width based on mouse pointer coordinates
      const newWidth = Math.max(260, Math.min(600, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // File loading helper
  const handleFileContent = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) onSchemaChange(text);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileContent(file);
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileContent(file);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative flex h-full">
      {/* Sidebar Panel */}
      <div
        id="sidebar-panel"
        style={{ width: isOpen ? `${sidebarWidth}px` : "0px" }}
        className={`relative h-full flex flex-col border-r shadow-md z-30 ${isOpen ? "opacity-100" : "opacity-0 overflow-hidden pointer-events-none"
          } ${isResizing ? "" : "transition-all duration-300"
          } ${isDarkMode
            ? "bg-slate-900 border-slate-800 text-slate-100"
            : "bg-slate-50 border-slate-200 text-slate-800"
          }`}
      >
        {/* Drag resize handle */}
        {isOpen && (
          <div
            onMouseDown={startResizing}
            className={`absolute top-0 right-0 w-1 h-full cursor-col-resize z-50 transition-colors ${isResizing ? "bg-indigo-500 scale-x-125" : "hover:bg-indigo-500/40"
              }`}
            title="Drag to resize"
          />
        )}
        {/* Header section */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="text-indigo-500" size={18} />
            <h2 className="font-bold text-sm tracking-tight font-sans">Schema Source Input</h2>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold flex items-center gap-1 ${parsedModels.length > 0
              ? "bg-emerald-500/10 text-emerald-500"
              : "bg-amber-500/15 text-amber-500"
              }`}
          >
            {parsedModels.length > 0 ? (
              <>
                <Check size={12} /> {parsedModels.length} models
              </>
            ) : (
              <>
                <AlertCircle size={12} /> 0 models
              </>
            )}
          </span>
        </div>

        {/* Scrollable contents */}
        <div className="flex-1 flex flex-col p-4 gap-4 min-h-0 overflow-hidden">
          {/* Text Area Input */}
          <div className="flex flex-col flex-1 min-h-[200px]">
            <div className="flex items-center justify-between mb-1.5 w-full">
              <label htmlFor="prisma-code-editor" className="text-xs font-bold text-slate-400 flex items-center gap-1">
                Prisma DSL Schema Code:
              </label>
              <div className="flex items-center gap-1.5 pointer-events-auto">
                {/* Format/Prettify Button */}
                <button
                  type="button"
                  title="Align columns and format Prisma schema code"
                  disabled={!schemaText.trim()}
                  onClick={() => {
                    const formatted = formatPrismaSchema(schemaText);
                    if (formatted) {
                      onSchemaChange(formatted);
                    }
                  }}
                  className={`text-[10px] font-bold uppercase cursor-pointer flex items-center gap-1 px-2 py-1 rounded-md border transition-all ${!schemaText.trim()
                    ? "opacity-45 cursor-not-allowed text-slate-500 border-slate-500/10 bg-transparent"
                    : isDarkMode
                      ? "text-teal-400 border-teal-500/25 bg-teal-500/5 bg-teal-500/10"
                      : "text-teal-600 border-teal-500/25 bg-teal-500/5 hover:bg-teal-500/10"
                    }`}
                >
                  {/* <Sparkles size={11} /> */}
                  <span>Format</span>
                </button>

                {/* Copy Button */}
                <button
                  type="button"
                  title="Copy code"
                  disabled={!schemaText.trim()}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(schemaText);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className={`text-[10px] font-bold uppercase cursor-pointer flex items-center gap-1 px-2 py-1 rounded-md border transition-all ${!schemaText.trim()
                    ? "opacity-45 cursor-not-allowed text-slate-500 border-slate-500/10 bg-transparent"
                    : copied
                      ? "text-emerald-500 border-emerald-500 bg-emerald-500/10"
                      : "text-slate-500 hover:text-slate-400 border-slate-500/20 bg-slate-500/5 hover:bg-slate-500/10"
                    }`}
                >
                  {copied ? (
                    <>
                      <Check size={11} className="text-emerald-500 shrink-0" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <FileCode size={11} />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                {/* Clear Button */}
                <button
                  type="button"
                  disabled={!schemaText.trim()}
                  onClick={handleClearClick}
                  className={`text-[10px] font-bold uppercase cursor-pointer flex items-center gap-1 px-2 py-1 rounded-md border transition-all ${!schemaText.trim()
                    ? "opacity-40 cursor-not-allowed text-slate-500 border-slate-500/10 bg-transparent"
                    : showClearConfirm
                      ? "text-amber-500 bg-amber-500/15 border-amber-500/30 animate-pulse font-extrabold"
                      : "text-rose-500 hover:text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/20"
                    }`}
                >
                  <Trash2 size={11} />
                  <span>{showClearConfirm ? "Sure?" : "Clear"}</span>
                </button>
              </div>
            </div>

            {/* Interactive syntax highlighted editor panel wrapper */}
            <div
              className={`relative w-full flex-1 min-h-[140px] rounded-xl border flex flex-col overflow-hidden transition-all duration-200 ${isDarkMode
                ? "bg-slate-950 border-slate-800"
                : "bg-white border-slate-200"
                }`}
            >
              {/* Underlying styled render engine */}
              <div
                ref={highlightOuterRef}
                className="absolute inset-0 p-3.5 font-mono text-xs leading-relaxed overflow-auto pointer-events-none select-none scrollbar-none"
                style={{
                  whiteSpace: "pre",
                }}
              >
                {schemaText.split("\n").map((line, idx) => highlightPrismaLine(line, idx, isDarkMode))}
              </div>

              {/* Foreground interactive text wrapper */}
              <textarea
                id="prisma-code-editor"
                ref={textareaRef}
                value={schemaText}
                onChange={(e) => onSchemaChange(e.target.value)}
                onScroll={handleScroll}
                placeholder="// Paste your Prisma schema here...&#10;model Blog {&#10;  id Int @id&#10;}"
                className={`absolute inset-0 w-full h-full p-3.5 bg-transparent outline-none border-0 font-mono text-xs leading-relaxed resize-none overflow-auto font-medium focus:ring-0 ${isDarkMode
                  ? "caret-indigo-400 placeholder-slate-700"
                  : "caret-indigo-500 placeholder-slate-400"
                  }`}
                style={{
                  WebkitTextFillColor: "transparent",
                  whiteSpace: "pre",
                }}
              />
            </div>
          </div>

          {/* File drag-and-drop dropzone */}
          {!schemaText.trim() && (
            <div
              id="drag-and-drop-zone"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 select-none ${isDragging
                ? "border-indigo-500 bg-indigo-500/10 scale-[0.98]"
                : isDarkMode
                  ? "border-slate-800 hover:border-slate-700 bg-slate-950/45 text-slate-400 hover:text-slate-200"
                  : "border-slate-300 hover:border-slate-400 bg-white text-slate-500 hover:text-slate-700"
                }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".prisma"
                className="hidden"
              />
              <Upload size={20} className="mx-auto mb-2 text-indigo-500" />
              <p className="text-xs font-bold">
                Drop your <code className="text-indigo-600 dark:text-indigo-400 font-mono">schema.prisma</code> here
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
                or click to browse local files
              </p>
            </div>
          )}

          {/* Syntax Cheat Sheet */}
          <div
            className={`rounded-xl border leading-relaxed text-xs shrink-0 mt-auto transition-all duration-300 ${isDarkMode ? "bg-slate-950/60 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-600"
              }`}
          >
            <button
              type="button"
              onClick={() => setIsCheatSheetOpen((prev) => !prev)}
              className="w-full flex items-center justify-between p-3.5 font-bold text-slate-500 dark:text-slate-300 hover:bg-slate-500/5 transition-colors focus:outline-none cursor-pointer rounded-xl"
            >
              <div className="flex items-center gap-1.5">
                <BookOpen size={14} className="text-indigo-500" />
                <span>Prisma DSL Cheat Sheet</span>
              </div>
              <div className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-200 transition-colors">
                {isCheatSheetOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </div>
            </button>

            {isCheatSheetOpen && (
              <div className="px-3.5 pb-3.5 pt-0">
                <ul className="space-y-2.5 font-medium text-[11px]">
                  <li className="flex items-start gap-2">
                    <Key size={12} className="text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      <code className="font-mono text-indigo-500 bg-slate-500/10 px-1 rounded font-semibold">@id</code>: Denotes the Primary Key of a Model.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Lock size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      <code className="font-mono text-emerald-500 bg-slate-500/10 px-1 rounded font-semibold">@unique</code>: Fields with unique constraint.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <HelpCircle size={12} className="text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      <code className="font-mono text-amber-500 bg-slate-500/10 px-1 rounded font-semibold">Type?</code>: Appends &apos;?&apos; for Nullable/Optional.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono text-purple-500 border border-purple-500/30 px-1 py-0.2 rounded text-[9px] leading-none bg-purple-500/5 font-bold shrink-0 mt-0.5">[]</span>
                    <span>
                      <code className="font-mono text-purple-500 bg-slate-500/10 px-1 rounded font-semibold">Type[]</code>: Multi-record arrays (Lists).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Link size={12} className="text-blue-500 shrink-0 mt-0.5" />
                    <span>
                      <code className="font-mono text-blue-500 bg-slate-500/10 px-1 rounded font-semibold">@relation(...)</code>: Defines explicit primary-foreign links.
                    </span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expand/Collapse Toggle Button handle on edge */}
      <button
        id="btn-sidebar-toggle"
        onClick={onToggle}
        title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        className={`absolute top-1/2 -right-4 -translate-y-1/2 w-4 h-16 rounded-r-lg flex items-center justify-center border-y border-r shadow-md z-40 cursor-pointer hover:bg-indigo-600 hover:text-white transition-all ${isDarkMode
          ? "bg-slate-900 border-slate-800 text-slate-400"
          : "bg-slate-50 border-slate-200 text-slate-500"
          }`}
      >
        {isOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>
    </div>
  );
}
