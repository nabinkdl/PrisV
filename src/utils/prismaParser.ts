
import { PrismaModel, PrismaField, PrismaRelation, VisualEdge, PrismaEnum } from "../types";

/**
 * Parses a raw Prisma schema content string into structured metadata and maps relation edges.
 */
export function parsePrismaSchema(schemaText: string): { models: PrismaModel[]; enums: PrismaEnum[] } {
  const models: PrismaModel[] = [];
  const enums: PrismaEnum[] = [];

  // 1. Clean up comments (both triple-slash and double-slash)
  // Preserve braces and letters, strip out trailing comments on field lines too
  const cleanLines = schemaText.split("\n").map(line => {
    // Strip comments
    let clean = line;
    const commentIdx = line.indexOf("//");
    if (commentIdx !== -1) {
      clean = line.substring(0, commentIdx);
    }
    return clean;
  });

  const cleanText = cleanLines.join("\n");

  // 2. Parse model blocks
  let index = 0;
  while (index < cleanText.length) {
    const nextModel = cleanText.substring(index).search(/\bmodel\s+([A-Za-z0-9_]+)\s*\{/);
    if (nextModel === -1) break;

    const absoluteStart = index + nextModel;
    const modelHeaderMatch = cleanText.substring(absoluteStart).match(/\bmodel\s+([A-Za-z0-9_]+)\s*\{/);
    if (!modelHeaderMatch) {
      // Advance to avoid infinite loop
      index = absoluteStart + 5;
      continue;
    }

    const modelName = modelHeaderMatch[1];
    const bodyStartIndex = absoluteStart + modelHeaderMatch[0].length;

    // Find the matching curly brace
    let bracketCount = 1;
    let scanIndex = bodyStartIndex;
    while (scanIndex < cleanText.length && bracketCount > 0) {
      const char = cleanText[scanIndex];
      if (char === "{") bracketCount++;
      else if (char === "}") bracketCount--;
      scanIndex++;
    }

    if (bracketCount === 0) {
      const bodyText = cleanText.substring(bodyStartIndex, scanIndex - 1);
      const fields: PrismaField[] = [];
      const attributes: string[] = [];

      const lines = bodyText.split("\n");
      for (const lineRaw of lines) {
        const line = lineRaw.trim();
        if (!line) continue;

        // Check if block attribute like @@id, @@unique, @@index
        if (line.startsWith("@@")) {
          attributes.push(line);
          continue;
        }

        // Parse fields: name type attributes...
        // Format: nameTypeAndAttrs match
        const fieldMatch = line.match(/^([A-Za-z0-9_]+)\s+([A-Za-z0-9_?\[\]]+)(.*)$/);
        if (fieldMatch) {
          const fieldName = fieldMatch[1];
          const fieldTypeStr = fieldMatch[2];
          const restOfLine = fieldMatch[3] ? fieldMatch[3].trim() : "";

          const isList = fieldTypeStr.endsWith("[]");
          const isOptional = fieldTypeStr.endsWith("?");
          const baseType = fieldTypeStr.replace("[]", "").replace("?", "");

          const isId = /\b@id\b/.test(restOfLine);
          const isUnique = /\b@unique\b/.test(restOfLine);

          // Detect if it is a relation field
          // Primitive types in Prisma: String, Boolean, Int, Float, Decimal, DateTime, Json, Bytes, Unsupported
          const primitiveTypes = [
            "String", "Boolean", "Int", "Float", "Decimal", "DateTime", "Json", "Bytes", "Unsupported", "BigInt"
          ];
          const isRelationField = !primitiveTypes.includes(baseType);

          // Parse @relation attribute details
          let relation: PrismaRelation | undefined = undefined;
          const relationMatch = restOfLine.match(/@relation\s*\(([^)]+)\)/);
          if (relationMatch) {
            const relBody = relationMatch[1];
            relation = {};

            // Extract relation name if present as first element quoted
            const nameMatch = relBody.match(/^\s*(["'])([A-Za-z0-9_-]+)\1/);
            if (nameMatch) {
              relation.name = nameMatch[2];
            }

            // Extract fields local: fields: [field1, field2]
            const fieldsMatch = relBody.match(/fields:\s*\[([^\]]+)\]/);
            if (fieldsMatch) {
              relation.fields = fieldsMatch[1].split(",").map(s => s.trim());
            }

            // Extract references remote: references: [field1, field2]
            const referencesMatch = relBody.match(/references:\s*\[([^\]]+)\]/);
            if (referencesMatch) {
              relation.references = referencesMatch[1].split(",").map(s => s.trim());
            }

            // Extract onDelete
            const deleteMatch = relBody.match(/onDelete:\s*([A-Za-z]+)/);
            if (deleteMatch) {
              relation.onDelete = deleteMatch[1];
            }

            // Extract onUpdate
            const updateMatch = relBody.match(/onUpdate:\s*([A-Za-z]+)/);
            if (updateMatch) {
              relation.onUpdate = updateMatch[1];
            }
          }

          // Parse default value
          let defaultValue: string | undefined = undefined;
          const defaultMatch = restOfLine.match(/@default\(([^)]+)\)/);
          if (defaultMatch) {
            defaultValue = defaultMatch[1].trim();
          }

          fields.push({
            id: `${modelName}-${fieldName}`,
            name: fieldName,
            type: fieldTypeStr,
            baseType,
            isId,
            isUnique,
            isOptional,
            isList,
            isForeignKey: false, // updated in post-processing
            isRelationField,
            relation,
            defaultValue,
            rawAttributes: restOfLine,
          });
        }
      }

      models.push({
        name: modelName,
        fields,
        attributes,
      });
    }

    index = scanIndex;
  }

  // 3. Post-Process: Parse block-level id/unique attributes, fallback PKs, and link foreign keys
  for (const model of models) {
    const blockIds: string[] = [];
    const blockUniques: string[] = [];

    for (const attr of model.attributes) {
      // Parse block-level IDs e.g. @@id([userId, followerId])
      const idMatch = attr.match(/@@id\s*\(\s*(?:fields\s*:\s*)?\[\s*([^\]]+)\s*\]/);
      if (idMatch) {
        const fields = idMatch[1].split(",").map(f => f.trim().replace(/["']/g, ""));
        blockIds.push(...fields);
      }
      // Parse block-level uniques e.g. @@unique([email, nickname])
      const uniqueMatch = attr.match(/@@unique\s*\(\s*(?:fields\s*:\s*)?\[\s*([^\]]+)\s*\]/);
      if (uniqueMatch) {
        const fields = uniqueMatch[1].split(",").map(f => f.trim().replace(/["']/g, ""));
        blockUniques.push(...fields);
      }
    }

    // Apply block level attributes
    for (const field of model.fields) {
      if (blockIds.includes(field.name)) {
        field.isId = true;
      }
      if (blockUniques.includes(field.name)) {
        field.isUnique = true;
      }
    }

    // Fallback: If no field is marked as ID, auto-detect common patterns
    const hasExplicitId = model.fields.some(f => f.isId);
    if (!hasExplicitId) {
      const fallbackIdField = model.fields.find(f => {
        const nameLower = f.name.toLowerCase();
        return nameLower === "id" ||
          nameLower === "_id" ||
          nameLower === "uid" ||
          nameLower === "uuid" ||
          nameLower === `${model.name.toLowerCase()}id` ||
          nameLower === `${model.name.toLowerCase()}_id`;
      });
      if (fallbackIdField) {
        fallbackIdField.isId = true;
      }
    }

    // Link foreign keys and mark them
    for (const field of model.fields) {
      if (field.isRelationField && field.relation && field.relation.fields && field.relation.references) {
        const relatedModelName = field.baseType;
        const forkFields = field.relation.fields;
        const refFields = field.relation.references;

        for (let i = 0; i < forkFields.length; i++) {
          const fkName = forkFields[i];
          const pkName = refFields[i] || "id"; // fallback to standard 'id'

          const localField = model.fields.find(f => f.name === fkName);
          if (localField) {
            localField.isForeignKey = true;
            localField.fkInfo = {
              relatedModel: relatedModelName,
              relatedField: pkName,
            };
          }
        }
      }
    }
  }

  // 4. Parse Enum blocks
  let enumIndex = 0;
  while (enumIndex < cleanText.length) {
    const nextEnum = cleanText.substring(enumIndex).search(/\benum\s+([A-Za-z0-9_]+)\s*\{/);
    if (nextEnum === -1) break;

    const absoluteStart = enumIndex + nextEnum;
    const enumHeaderMatch = cleanText.substring(absoluteStart).match(/\benum\s+([A-Za-z0-9_]+)\s*\{/);
    if (!enumHeaderMatch) {
      enumIndex = absoluteStart + 5;
      continue;
    }

    const enumName = enumHeaderMatch[1];
    const bodyStartIndex = absoluteStart + enumHeaderMatch[0].length;

    let bracketCount = 1;
    let scanIndex = bodyStartIndex;
    while (scanIndex < cleanText.length && bracketCount > 0) {
      const char = cleanText[scanIndex];
      if (char === "{") bracketCount++;
      else if (char === "}") bracketCount--;
      scanIndex++;
    }

    if (bracketCount === 0) {
      const bodyText = cleanText.substring(bodyStartIndex, scanIndex - 1);
      const values: string[] = [];
      const lines = bodyText.split("\n");
      for (const lineRaw of lines) {
        const line = lineRaw.trim();
        if (!line) continue;

        // Match enum value (identifiers)
        const valMatch = line.match(/^([A-Za-z0-9_]+)/);
        if (valMatch) {
          values.push(valMatch[1]);
        }
      }
      enums.push({
        name: enumName,
        values
      });
    }
    enumIndex = scanIndex;
  }

  return { models, enums };
}

/**
 * Derives visual relationship edges from list of parsed models.
 * Groups double directional relationships cleanly.
 */
export function deriveVisualEdges(models: PrismaModel[]): VisualEdge[] {
  const edges: VisualEdge[] = [];
  const processedRelations = new Set<string>();

  for (const model of models) {
    for (const field of model.fields) {
      if (field.isRelationField) {
        const targetModelName = field.baseType;
        // Verify target model actually exists in the parsed models list
        const targetModel = models.find(m => m.name === targetModelName);
        if (!targetModel) continue;

        // Generate a standard alphabetical signature so we don't duplicate bidirectional edges
        const pairKeyStr = [model.name, targetModelName].sort().join("<=>");

        // 1. Explicit Relation check with fields and references
        if (field.relation && field.relation.fields && field.relation.references) {
          const localField = field.relation.fields[0];
          const foreignField = field.relation.references[0];

          // Determine relationship type:
          // Check the back-relation in targetModel to see if it is list or singular
          const backField = targetModel.fields.find(f => f.baseType === model.name);
          let relationType: "1-1" | "1-n" | "n-n" = "1-n";

          if (backField) {
            if (field.isList && backField.isList) {
              relationType = "n-n";
            } else if (!field.isList && !backField.isList) {
              relationType = "1-1";
            } else {
              relationType = "1-n";
            }
          }

          edges.push({
            id: `edge-${model.name}-${field.name}-${targetModelName}`,
            fromModel: model.name,
            fromField: localField || field.name,
            toModel: targetModelName,
            toField: foreignField || "id",
            relationType,
            isImplicit: false,
            rawRelationText: `@relation(fields: [${field.relation.fields.join(", ")}], references: [${field.relation.references.join(", ")}])`,
          });

          processedRelations.add(pairKeyStr);
        } else {
          // Check if this is an implicit relation already handled or needs creation
          if (!processedRelations.has(pairKeyStr)) {
            // Check back field
            const backField = targetModel.fields.find(f => f.baseType === model.name);

            // Let's check relation attributes or names to match
            const hasExplicitRelationOpposite = backField?.relation && backField.relation.fields && backField.relation.references;

            if (hasExplicitRelationOpposite) {
              // This is just the other side of an explicit relation, so we don't draw an extra implicit line
              continue;
            }

            // This is an implicit relation (e.g. implicit many-to-many posts Post[] vs users User[])
            const isBothList = field.isList && (backField ? backField.isList : false);
            const rType = isBothList ? "n-n" : (field.isList || (backField ? backField.isList : false) ? "1-n" : "1-1");

            edges.push({
              id: `edge-implicit-${model.name}-${targetModelName}`,
              fromModel: model.name,
              fromField: field.name,
              toModel: targetModelName,
              toField: backField?.name || "id",
              relationType: rType,
              isImplicit: true,
              rawRelationText: `Implicit relation between ${model.name}.${field.name} and ${targetModelName}.${backField?.name || "..."}`,
            });

            processedRelations.add(pairKeyStr);
          }
        }
      }
    }
  }

  return edges;
}
