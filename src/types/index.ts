export interface ParsedColumn {
  name: string
  dataType: string
  isPrimaryKey: boolean
  isForeignKey: boolean
  isNullable: boolean
  references?: {
    table: string
    column: string
  }
}

export interface ParsedTable {
  name: string
  columns: ParsedColumn[]
}

export interface ParsedRelation {
  id: string
  sourceTable: string
  sourceColumn: string
  targetTable: string
  targetColumn: string
  type: "1:1" | "1:N"
}

export interface ParsedSchema {
  tables: ParsedTable[]
  relations: ParsedRelation[]
}

export interface TableNodeData {
  tableName: string
  columns: ParsedColumn[]
  fontSize: number
  cardWidth: number
  borderWidth: number
  [key: string]: unknown
}
