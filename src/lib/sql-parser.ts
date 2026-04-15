import { Parser } from "node-sql-parser"
import type { ParsedSchema, ParsedTable, ParsedColumn, ParsedRelation } from "@/types"

interface AstColumnRef {
  type: "column_ref"
  column: string
}

interface AstColumnDef {
  resource: "column"
  column: AstColumnRef
  definition: { dataType: string; length?: number; scale?: number }
  primary_key?: string
  unique?: string
  nullable?: { type: string }
  references?: {
    table: { table: string }[]
    definition: AstColumnRef[]
  }
}

interface AstConstraint {
  resource: "constraint"
  constraint_type: string
  definition: AstColumnRef[]
  reference_definition?: {
    table: { table: string }[]
    definition: AstColumnRef[]
  }
}

interface AstCreateTable {
  type: "create"
  keyword: "table"
  table: { table: string }[]
  create_definitions: (AstColumnDef | AstConstraint)[]
}

function getDataType(def: AstColumnDef["definition"]): string {
  let type = def.dataType
  if (def.length != null) {
    type += def.scale != null ? `(${def.length},${def.scale})` : `(${def.length})`
  }
  return type
}

function isColumnDef(item: AstColumnDef | AstConstraint): item is AstColumnDef {
  return item.resource === "column"
}

function isConstraint(item: AstColumnDef | AstConstraint): item is AstConstraint {
  return item.resource === "constraint"
}

const parser = new Parser()

export function parseSql(sql: string): ParsedSchema {
  const ast = parser.astify(sql, { database: "MySQL" }) as AstCreateTable[]
  const statements = Array.isArray(ast) ? ast : [ast]

  const tables: ParsedTable[] = []
  const relations: ParsedRelation[] = []
  const fkColumnMap = new Map<string, Set<string>>()
  const uniqueColumns = new Map<string, Set<string>>()

  for (const stmt of statements) {
    if (stmt.type !== "create" || stmt.keyword !== "table") continue

    const tableName = stmt.table[0]?.table
    if (!tableName) continue

    const columns: ParsedColumn[] = []
    const pkSet = new Set<string>()
    const ukSet = new Set<string>()

    for (const def of stmt.create_definitions) {
      if (isColumnDef(def)) {
        const colName = def.column.column
        const dataType = getDataType(def.definition)
        const isPK = def.primary_key != null
        const isFK = def.references != null
        const isNullable = def.nullable?.type !== "not null"
        const isUnique = def.unique != null

        if (isPK) pkSet.add(colName)
        if (isUnique) ukSet.add(colName)

        const col: ParsedColumn = {
          name: colName,
          dataType,
          isPrimaryKey: isPK,
          isForeignKey: isFK,
          isNullable,
        }

        if (isFK && def.references) {
          const targetTable = def.references.table[0]?.table ?? ""
          const targetColumn = def.references.definition[0]?.column ?? ""
          col.references = { table: targetTable, column: targetColumn }

          const key = `${tableName}.${colName}`
          if (!fkColumnMap.has(key)) fkColumnMap.set(key, new Set())
          fkColumnMap.get(key)!.add(`${targetTable}.${targetColumn}`)

          const relId = `rel_${tableName}_${colName}_${targetTable}_${targetColumn}`
          const relationType = isUnique || isPK ? "1:1" : "1:N"
          relations.push({
            id: relId,
            sourceTable: tableName,
            sourceColumn: colName,
            targetTable,
            targetColumn,
            type: relationType,
          })
        }

        columns.push(col)
      } else if (isConstraint(def)) {
        if (def.constraint_type === "PRIMARY KEY") {
          for (const colRef of def.definition) {
            pkSet.add(colRef.column)
            const existing = columns.find((c) => c.name === colRef.column)
            if (existing) existing.isPrimaryKey = true
          }
        } else if (def.constraint_type === "FOREIGN KEY" && def.reference_definition) {
          const targetTable = def.reference_definition.table[0]?.table ?? ""
          for (let i = 0; i < def.definition.length; i++) {
            const sourceCol = def.definition[i].column
            const targetCol = def.reference_definition.definition[i]?.column ?? ""
            const existing = columns.find((c) => c.name === sourceCol)
            if (existing) {
              existing.isForeignKey = true
              existing.references = { table: targetTable, column: targetCol }
            }

            const relId = `rel_${tableName}_${sourceCol}_${targetTable}_${targetCol}`
            const isUnique = ukSet.has(sourceCol) || pkSet.has(sourceCol)
            relations.push({
              id: relId,
              sourceTable: tableName,
              sourceColumn: sourceCol,
              targetTable,
              targetColumn: targetCol,
              type: isUnique ? "1:1" : "1:N",
            })
          }
        } else if (def.constraint_type === "UNIQUE") {
          for (const colRef of def.definition) {
            ukSet.add(colRef.column)
          }
        }
      }
    }

    uniqueColumns.set(tableName, ukSet)
    tables.push({ name: tableName, columns })
  }

  return { tables, relations }
}
