/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import { PrismaModel, PrismaEnum } from "../types";

/**
 * Converts multiple Prisma models and enums into a single robust PostgreSQL script.
 */
export function generateFullSQL(models: PrismaModel[], enums: PrismaEnum[] = []): string {
  let sql = `-- Database Schema SQL (PostgreSQL)\n`;
  sql += `-- Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`;
  sql += `-- Auto-compiled with Prisma Vis Schema Exporter v1.0\n\n`;

  // 1. Create custom postgres types for enums
  if (enums.length > 0) {
    sql += `-- =====================================================\n`;
    sql += `-- 1. Custom Postgres Enums\n`;
    sql += `-- =====================================================\n\n`;
    for (const enumItem of enums) {
      const vals = enumItem.values.map(v => `'${v}'`).join(", ");
      sql += `CREATE TYPE "${enumItem.name}" AS ENUM (${vals});\n`;
    }
    sql += `\n`;
  }

  // 2. Create tables
  sql += `-- =====================================================\n`;
  sql += `-- 2. Tables & Field Definitions\n`;
  sql += `-- =====================================================\n\n`;

  for (const model of models) {
    sql += `CREATE TABLE "${model.name}" (\n`;
    const columns: string[] = [];
    const constraints: string[] = [];

    for (const field of model.fields) {
      if (field.isRelationField) continue; // Skip custom physical relation model objects

      let type = "VARCHAR(255)";
      const baseL = field.baseType.toLowerCase();

      // Check if baseType is custom enum name
      const isEnum = enums.some(e => e.name === field.baseType);

      if (isEnum) {
        type = `"${field.baseType}"`;
      } else if (baseL === "int") {
        type = field.isId ? "SERIAL" : "INT";
      } else if (baseL === "string") {
        type = "VARCHAR(255)";
      } else if (baseL === "boolean") {
        type = "BOOLEAN";
      } else if (baseL === "datetime") {
        type = "TIMESTAMP";
      } else if (baseL === "decimal") {
        type = "DECIMAL(10, 2)";
      } else if (baseL === "float") {
        type = "DOUBLE PRECISION";
      } else if (baseL === "json") {
        type = "JSONB";
      } else if (baseL === "bytes") {
        type = "BYTEA";
      } else if (baseL === "bigint") {
        type = "BIGINT";
      }

      let colDef = `  "${field.name}" ${type}`;

      if (!field.isOptional && !field.isId) {
        colDef += " NOT NULL";
      }

      if (field.isId) {
        colDef += " PRIMARY KEY";
      }

      if (field.isUnique && !field.isId) {
        colDef += " UNIQUE";
      }

      if (field.defaultValue) {
        if (field.defaultValue === "autoincrement()") {
          // Handled implicitly by SERIAL type in postgres
          if (baseL !== "int") {
            colDef += " DEFAULT nextval(...)";
          }
        } else if (field.defaultValue === "now()") {
          colDef += " DEFAULT CURRENT_TIMESTAMP";
        } else if (field.defaultValue === "uuid()") {
          colDef += " DEFAULT gen_random_uuid()";
        } else if (field.defaultValue === "cuid()") {
          colDef += " DEFAULT generate_cuid()";
        } else {
          if (isEnum) {
            colDef += ` DEFAULT '${field.defaultValue}'`;
          } else {
            colDef += ` DEFAULT ${field.defaultValue}`;
          }
        }
      }

      columns.push(colDef);

      if (field.isForeignKey && field.fkInfo) {
        constraints.push(
          `  CONSTRAINT "fk_${model.name}_${field.name}" FOREIGN KEY ("${field.name}") REFERENCES "${field.fkInfo.relatedModel}"("${field.fkInfo.relatedField}") ON DELETE CASCADE`
        );
      }
    }

    const allLines = [...columns, ...constraints];
    sql += allLines.join(",\n");
    sql += "\n);\n\n";
  }

  return sql;
}

/**
 * Converts multiple Prisma models and enums into fully-typed TypeScript interface representations.
 */
export function generateFullTypeScript(models: PrismaModel[], enums: PrismaEnum[] = []): string {
  let ts = `/**\n * TypeScript Enterprise Type-Safe Mappings\n * Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n */\n\n`;

  // 1. Enum types
  if (enums.length > 0) {
    ts += `/* Enums definitions */\n`;
    for (const enumItem of enums) {
      ts += `export enum ${enumItem.name} {\n`;
      for (const val of enumItem.values) {
        ts += `  ${val} = "${val}",\n`;
      }
      ts += `}\n\n`;
    }
  }

  // 2. Interfaces
  ts += `/* Models interfaces */\n`;
  for (const model of models) {
    ts += `export interface ${model.name} {\n`;
    for (const field of model.fields) {
      let type = "any";
      const baseL = field.baseType.toLowerCase();

      // Check if it matches an enum name
      const isEnum = enums.some(e => e.name === field.baseType);

      if (isEnum) {
        type = field.baseType;
      } else if (baseL === "int" || baseL === "float" || baseL === "decimal" || baseL === "bigint") {
        type = "number";
      } else if (baseL === "string") {
        type = "string";
      } else if (baseL === "boolean") {
        type = "boolean";
      } else if (baseL === "datetime") {
        type = "Date";
      } else if (field.isRelationField) {
        type = field.baseType;
      }

      if (field.isList) {
        type += "[]";
      }

      ts += `  ${field.name}${field.isOptional ? "?" : ""}: ${type};\n`;
    }
    ts += `}\n\n`;
  }

  return ts;
}
