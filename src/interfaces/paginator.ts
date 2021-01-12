
export type OrderBy<TEntity> = {
  [TKey in keyof TEntity]?: boolean
}

export type ColumnNameMap<TEntity> = {
  [TKey in keyof TEntity]?: string
}

export type Cursor<TEntity> = {
  [TKey in keyof TEntity]?: any
}

export interface CursorPagination<TEntity> {
  nodes: TEntity[]
  hasPrev: boolean
  hasNext: boolean
  prevCursor?: string
  nextCursor?: string
}

export interface CursorTransformer<TEntity> {
  parse(text: string): Cursor<TEntity>
  stringify(cursor: Cursor<TEntity>): string
}

export interface PagePagination<TEntity> {
  nodes: TEntity[]
  hasNext: boolean
}
