import { Cursor, CursorTransformer } from '../interfaces/paginator'


export class Base64Transformer<TEntity> implements CursorTransformer<TEntity> {
  parse(text: string): Cursor<TEntity> {
    return JSON.parse(Buffer.from(text, 'base64').toString())
  }

  stringify(cursor: Cursor<TEntity>): string {
    return Buffer.from(JSON.stringify(cursor)).toString('base64').replace(/=+$/, '')
  }
}
