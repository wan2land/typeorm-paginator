import { Cursor, CursorTransformer } from '../interfaces/paginator'


export class JsonTransformer<TEntity> implements CursorTransformer<TEntity> {
  parse(text: string): Cursor<TEntity> {
    return JSON.parse(text)
  }

  stringify(cursor: Cursor<TEntity>): string {
    return JSON.stringify(cursor)
  }
}
