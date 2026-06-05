
import React from "react";

/**
 * A highly robust and beautiful formatter (Prettifier) for Prisma DSL schemas.
 * Aligns field definitions inside models into columns: Name, Type, and attributes.
 */
export function formatPrismaSchema(code: string): string {
  if (!code || !code.trim()) return "";

  const lines = code.split("\n");
  const formattedLines: string[] = [];

  let currentBlockType: "model" | "enum" | "datasource" | "generator" | null = null;
  let currentBlockLines: string[] = [];

  const flushBlock = () => {
    if (!currentBlockType) return;

    if (currentBlockType === "model") {
      formattedLines.push(...formatModelBlock(currentBlockLines));
    } else if (currentBlockType === "enum") {
      formattedLines.push(...formatEnumBlock(currentBlockLines));
    } else {
      formattedLines.push(...formatGenericBlock(currentBlockLines));
    }

    currentBlockLines = [];
    currentBlockType = null;
  };

  for (let line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("model ") && trimmed.endsWith("{")) {
      flushBlock();
      currentBlockType = "model";
      currentBlockLines.push(line);
    } else if (trimmed.startsWith("enum ") && trimmed.endsWith("{")) {
      flushBlock();
      currentBlockType = "enum";
      currentBlockLines.push(line);
    } else if ((trimmed.startsWith("datasource ") || trimmed.startsWith("generator ")) && trimmed.endsWith("{")) {
      flushBlock();
      currentBlockType = trimmed.startsWith("datasource") ? "datasource" : "generator";
      currentBlockLines.push(line);
    } else if (trimmed === "}") {
      currentBlockLines.push(line);
      flushBlock();
    } else if (currentBlockType) {
      currentBlockLines.push(line);
    } else {
      formattedLines.push(trimmed);
    }
  }

  flushBlock();

  let result = formattedLines.join("\n");
  result = result.replace(/\n{3,}/g, "\n\n");
  return result.trim() + "\n";
}

function formatModelBlock(lines: string[]): string[] {
  if (lines.length === 0) return [];

  const header = lines[0].trim();
  const footer = "}";
  const innerLines = lines.slice(1, -1);

  interface FieldDef {
    rawLine?: string;
    isCommentOrEmpty: boolean;
    name: string;
    type: string;
    attributes: string;
    commentSuffix: string;
  }

  const parsedFields: FieldDef[] = [];

  for (const line of innerLines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("//") || trimmed === "") {
      parsedFields.push({
        rawLine: trimmed,
        isCommentOrEmpty: true,
        name: "",
        type: "",
        attributes: "",
        commentSuffix: ""
      });
      continue;
    }

    let codePart = trimmed;
    let commentSuffix = "";
    const doubleSlashIdx = trimmed.indexOf("//");
    if (doubleSlashIdx !== -1) {
      codePart = trimmed.substring(0, doubleSlashIdx).trim();
      commentSuffix = trimmed.substring(doubleSlashIdx).trim();
    }

    const tokens = codePart.split(/\s+/);
    if (tokens.length >= 2) {
      const name = tokens[0];
      const type = tokens[1];
      const attributes = tokens.slice(2).join(" ");

      parsedFields.push({
        isCommentOrEmpty: false,
        name,
        type,
        attributes,
        commentSuffix
      });
    } else {
      parsedFields.push({
        rawLine: trimmed,
        isCommentOrEmpty: true,
        name: "",
        type: "",
        attributes: "",
        commentSuffix: ""
      });
    }
  }

  let maxNameLen = 0;
  let maxTypeLen = 0;

  for (const f of parsedFields) {
    if (!f.isCommentOrEmpty) {
      if (f.name.length > maxNameLen) maxNameLen = f.name.length;
      if (f.type.length > maxTypeLen) maxTypeLen = f.type.length;
    }
  }

  const result: string[] = [header];

  for (const f of parsedFields) {
    if (f.isCommentOrEmpty) {
      if (f.rawLine === "") {
        result.push("");
      } else {
        result.push(`  ${f.rawLine}`);
      }
    } else {
      const paddedName = f.name.padEnd(maxNameLen);
      const paddedType = f.type.padEnd(maxTypeLen);

      let lineOutput = `  ${paddedName} ${paddedType}`;
      if (f.attributes) {
        lineOutput += ` ${f.attributes}`;
      }
      if (f.commentSuffix) {
        lineOutput += ` ${f.commentSuffix}`;
      }
      result.push(lineOutput);
    }
  }

  result.push(footer);
  return result;
}

function formatEnumBlock(lines: string[]): string[] {
  if (lines.length === 0) return [];
  const header = lines[0].trim();
  const footer = "}";
  const innerLines = lines.slice(1, -1);

  const result: string[] = [header];

  for (const line of innerLines) {
    const trimmed = line.trim();
    if (trimmed === "") {
      result.push("");
    } else if (trimmed.startsWith("//")) {
      result.push(`  ${trimmed}`);
    } else {
      const dSIdx = trimmed.indexOf("//");
      if (dSIdx !== -1) {
        const code = trimmed.substring(0, dSIdx).trim();
        const comment = trimmed.substring(dSIdx).trim();
        result.push(`  ${code} ${comment}`);
      } else {
        result.push(`  ${trimmed}`);
      }
    }
  }

  result.push(footer);
  return result;
}

function formatGenericBlock(lines: string[]): string[] {
  if (lines.length === 0) return [];
  const header = lines[0].trim();
  const footer = "}";
  const innerLines = lines.slice(1, -1);

  const result: string[] = [header];

  for (const line of innerLines) {
    const trimmed = line.trim();
    if (trimmed === "") {
      result.push("");
    } else {
      result.push(`  ${trimmed}`);
    }
  }

  result.push(footer);
  return result;
}

/**
 * Highlights a single line of Prisma schema DSL and outputs colored JSX/React elements.
 */
export function highlightPrismaLine(line: string, lineIdx: number, isDarkMode: boolean): React.ReactNode {
  if (!line || line.trim() === "") {
    return <div key={lineIdx} className="min-h-[16.5px]">&nbsp;</div>;
  }

  // Pre-split inline comments starting with double slash
  let codePart = line;
  let commentPart = "";
  const commentIdx = line.indexOf("//");
  if (commentIdx !== -1) {
    codePart = line.substring(0, commentIdx);
    commentPart = line.substring(commentIdx);
  }

  // Highlight regular code tokens
  const tokens: { text: string; className: string }[] = [];
  let remaining = codePart;

  const blockReg = /^(model|enum|datasource|generator)\b/;
  const attrReg = /^(@[a-zA-Z_0-9.]+)/;
  const funcReg = /^([a-zA-Z_]+\([\w, "']*\))/;
  const stringReg = /^("[^"]*")/;
  const numberReg = /^(\d+)\b/;
  const punctuationReg = /^([{}()\[\]:=,.&|<>!*+-])/;
  const wordReg = /^([a-zA-Z_][a-zA-Z0-9_]*)/;
  const whitespaceReg = /^(\s+)/;

  while (remaining.length > 0) {
    let match: RegExpExecArray | null;

    if ((match = whitespaceReg.exec(remaining))) {
      tokens.push({ text: match[1], className: "" });
      remaining = remaining.substring(match[0].length);
    } else if ((match = blockReg.exec(remaining))) {
      tokens.push({ text: match[1], className: "text-amber-500 font-bold dark:text-amber-400" });
      remaining = remaining.substring(match[0].length);
    } else if ((match = attrReg.exec(remaining))) {
      tokens.push({ text: match[1], className: "text-purple-500 font-semibold dark:text-fuchsia-400" });
      remaining = remaining.substring(match[0].length);
    } else if ((match = funcReg.exec(remaining))) {
      tokens.push({ text: match[1], className: "text-indigo-500 font-semibold dark:text-cyan-400" });
      remaining = remaining.substring(match[0].length);
    } else if ((match = stringReg.exec(remaining))) {
      tokens.push({ text: match[1], className: "text-emerald-600 dark:text-emerald-400 font-medium" });
      remaining = remaining.substring(match[0].length);
    } else if ((match = numberReg.exec(remaining))) {
      tokens.push({ text: match[1], className: "text-orange-500 font-semibold dark:text-orange-400" });
      remaining = remaining.substring(match[0].length);
    } else if ((match = wordReg.exec(remaining))) {
      const word = match[1];
      const builtInTypes = ["Int", "String", "Boolean", "DateTime", "Float", "Decimal", "Json", "Bytes", "BigInt"];

      if (builtInTypes.includes(word)) {
        tokens.push({ text: word, className: "text-blue-500 font-bold dark:text-blue-400" });
      } else {
        tokens.push({ text: word, className: isDarkMode ? "text-slate-300" : "text-slate-700" });
      }
      remaining = remaining.substring(match[0].length);
    } else if ((match = punctuationReg.exec(remaining))) {
      tokens.push({ text: match[1], className: "text-slate-400 dark:text-slate-600" });
      remaining = remaining.substring(match[0].length);
    } else {
      // Pick next character
      const char = remaining.charAt(0);
      tokens.push({ text: char, className: isDarkMode ? "text-slate-300" : "text-slate-700" });
      remaining = remaining.substring(1);
    }
  }

  return (
    <div key={lineIdx} className="min-h-[16.5px] leading-[1.6] whitespace-pre">
      {tokens.map((t, idx) => (
        <span key={idx} className={t.className}>
          {t.text}
        </span>
      ))}
      {commentPart && (
        <span className="text-slate-500 italic dark:text-slate-500">
          {commentPart}
        </span>
      )}
    </div>
  );
}
