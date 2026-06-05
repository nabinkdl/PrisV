
import { PrismaModel } from "../types";

/**
 * Coverts a Prisma model structure into standard SQL CREATE TABLE commands.
 */
export function modelToSQL(model: PrismaModel): string {
  let sql = `CREATE TABLE "${model.name}" (\n`;
  const columns: string[] = [];
  const constraints: string[] = [];

  for (const field of model.fields) {
    if (field.isRelationField) continue; // Skip physical ORM relation handle fields

    let type = "VARCHAR(255)";
    const baseL = field.baseType.toLowerCase();

    if (baseL === "int") {
      type = (field.isId && field.defaultValue === "autoincrement()") ? "SERIAL" : "INT";
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
      type = (field.isId && field.defaultValue === "autoincrement()") ? "BIGSERIAL" : "BIGINT";
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
        // Handled automatically by SERIAL/BIGSERIAL in PostgreSQL
      } else if (field.defaultValue === "now()") {
        colDef += " DEFAULT CURRENT_TIMESTAMP";
      } else if (field.defaultValue === "uuid()" || field.defaultValue === "cuid()") {
        // Omit DEFAULT in SQL; handled by Prisma at the application level
      } else {
        colDef += ` DEFAULT ${field.defaultValue}`;
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
  sql += "\n);";
  return sql;
}

/**
 * Converts a Prisma model structure into a matching TypeScript interface dcl.
 */
export function modelToTypeScript(model: PrismaModel): string {
  let ts = `export interface ${model.name} {\n`;

  for (const field of model.fields) {
    let type = "any";
    const baseL = field.baseType.toLowerCase();

    if (baseL === "int" || baseL === "float" || baseL === "decimal" || baseL === "bigint") {
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

    let line = `  ${field.name}${field.isOptional ? "?" : ""}: ${type};`;
    if (field.defaultValue) {
      line += ` // @default(${field.defaultValue})`;
    }
    ts += line + "\n";
  }

  ts += `}`;
  return ts;
}
