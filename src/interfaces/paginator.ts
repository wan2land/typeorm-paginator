
export type Nullable<T> = {
  [P in keyof T]?: T[P] | null
}

export interface Take {
  default: number
  min: number
  max: number
}

export type OrderBy<TEntity> = {
  [TKey in keyof TEntity]?: boolean
}

export type Cursor<TEntity> = {
  [TKey in keyof TEntity]?: any
}

export interface CursorPagination<TEntity> {
  readonly count: number
  readonly nodes: TEntity[]
  readonly hasPrev: boolean
  readonly hasNext: boolean
  readonly prevCursor: string | null
  readonly nextCursor: string | null
}

export interface CursorTransformer<TEntity> {
  parse(text: string): Cursor<TEntity>
  stringify(cursor: Cursor<TEntity>): string
}

export interface PagePagination<TEntity> {
  readonly count: number
  readonly nodes: TEntity[]
  readonly hasNext: boolean
}

export interface PromisePagePagination<TEntity> {
  readonly count: Promise<number>
  readonly nodes: Promise<TEntity[]>
  readonly hasNext: Promise<boolean>
}
