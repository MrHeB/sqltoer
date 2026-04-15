import { useState, useCallback } from "react"
import type { ParsedSchema } from "@/types"
import { parseSql } from "@/lib/sql-parser"

export function useSqlParser() {
  const [schema, setSchema] = useState<ParsedSchema | null>(null)
  const [error, setError] = useState<string | null>(null)

  const parse = useCallback((sql: string) => {
    try {
      const result = parseSql(sql)
      setSchema(result)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "SQL 解析失败")
      setSchema(null)
    }
  }, [])

  return { schema, error, parse }
}
