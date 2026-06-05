
export interface PrismaRelation {
  name?: string;
  fields?: string[];
  references?: string[];
  onDelete?: string;
  onUpdate?: string;
}

export interface PrismaField {
  id: string; // Unique within model/app for mapping
  name: string;
  type: string;
  baseType: string; // Type with [] and ? stripped
  isId: boolean;
  isUnique: boolean;
  isOptional: boolean;
  isList: boolean;
  isForeignKey: boolean;
  isRelationField: boolean; // Field that represents the relation (e.g. author User)
  fkInfo?: {
    relatedModel: string;
    relatedField: string;
  };
  relation?: PrismaRelation;
  defaultValue?: string;
  rawAttributes: string;
}

export interface PrismaModel {
  name: string;
  fields: PrismaField[];
  attributes: string[]; // Block level attributes like @@unique, @@id
}

export interface PrismaEnum {
  name: string;
  values: string[];
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface VisualEdge {
  id: string;
  fromModel: string;
  fromField?: string;
  toModel: string;
  toField?: string;
  relationType: "1-1" | "1-n" | "n-n";
  isImplicit: boolean;
  rawRelationText?: string;
}
