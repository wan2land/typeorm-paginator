import { SelectQueryBuilder, ObjectType } from 'typeorm'

import { CursorPagination, Cursor, OrderBy, ColumnNameMap, CursorTransformer, Nullable, Take } from './interfaces/paginator'
import { Base64Transformer } from './transformers/base64-transformer'


export interface CursorPaginatorParams<TEntity> {
  orderBy: OrderBy<TEntity> | OrderBy<TEntity>[]
  columnNames?: ColumnNameMap<TEntity> | null
  take?: Nullable<Take> | number | null
  transformer?: CursorTransformer<TEntity> | null
}

export interface CursorPaginatorPaginateParams {
  prevCursor?: string | null
  nextCursor?: string | null
  take?: number | null
}

export class CursorPaginator<TEntity> {

  orders: [keyof TEntity, boolean][] = []
  columnNames: ColumnNameMap<TEntity>
  takeOptions: Take
  transformer: CursorTransformer<TEntity>

  constructor(
    public entity: ObjectType<TEntity>,
    {
      orderBy,
      columnNames,
      take,
      transformer,
    }: CursorPaginatorParams<TEntity>,
  ) {
    for (const order of Array.isArray(orderBy) ? orderBy : [orderBy]) {
      for (const [key, value] of Object.entries(order)) {
        this.orders.push([key as keyof TEntity, value as boolean])
      }
    }
    this.columnNames = columnNames ?? {}
    this.takeOptions = typeof take === 'number' ? {
      default: take,
      min: 0,
      max: Infinity,
    } : {
      default: take?.default ?? 20,
      min: Math.max(0, take?.min ?? 0), // never negative
      max: take?.max ?? Infinity,
    }
    this.transformer = transformer ?? new Base64Transformer()
  }

  async paginate(qb: SelectQueryBuilder<TEntity>, params: CursorPaginatorPaginateParams = {}): Promise<CursorPagination<TEntity>> {
    const take = Math.max(this.takeOptions.min, Math.min(params.take || this.takeOptions.default, this.takeOptions.max))

    if (params.prevCursor) {
      try {
        this._applyWhereQuery(qb, this.transformer.parse(params.prevCursor), false)
      } catch {
        qb.andWhere('1 = 0')
      }
      for (const [key, value] of this.orders) {
        qb.addOrderBy(this.columnNames[key] ?? `${qb.alias}.${key}`, value ? 'DESC' : 'ASC')
      }

      let hasPrev = false
      const nodes = await qb.clone().take(take + 1).getMany().then(nodes => {
        if (nodes.length > take) {
          hasPrev = true
        }
        return nodes.slice(0, take).reverse()
      })

      return {
        nodes,
        hasPrev,
        hasNext: true,
        prevCursor: nodes.length > 0 ? this.transformer.stringify(this._createCursor(nodes[0])) : null,
        nextCursor: nodes.length > 0 ? this.transformer.stringify(this._createCursor(nodes[nodes.length - 1])) : null,
      }
    }

    if (params.nextCursor) {
      try {
        this._applyWhereQuery(qb, this.transformer.parse(params.nextCursor), true)
      } catch {
        qb.andWhere('1 = 0')
      }
    }
    for (const [key, value] of this.orders) {
      qb.addOrderBy(this.columnNames[key] ?? `${qb.alias}.${key}`, value ? 'ASC' : 'DESC')
    }

    let hasNext = false
    const nodes = await qb.clone().take(take + 1).getMany().then(nodes => {
      if (nodes.length > take) {
        hasNext = true
      }
      return nodes.slice(0, take)
    })

    return {
      nodes: nodes.slice(0, take),
      hasPrev: !!params.nextCursor,
      hasNext,
      prevCursor: nodes.length > 0 ? this.transformer.stringify(this._createCursor(nodes[0])) : null,
      nextCursor: nodes.length > 0 ? this.transformer.stringify(this._createCursor(nodes[nodes.length - 1])) : null,
    }
  }

  _applyWhereQuery(qb: SelectQueryBuilder<TEntity>, cursor: Cursor<TEntity>, isNext: boolean) {
    const metadata = qb.expressionMap.mainAlias!.metadata

    let queryPrefix = ''
    const queryParts = [] as string[]
    const queryParams = {} as Record<string, any>

    for (const [key, asc] of this.orders) {
      const columnName = this.columnNames[key] ?? `${qb.alias}.${key}`
      queryParts.push(`(${queryPrefix}${columnName} ${!asc !== isNext ? '>' : '<'} :cursor__${key as string})`)
      queryPrefix = `${queryPrefix}${columnName} = :cursor__${key as string} AND `

      const column = metadata.findColumnWithPropertyPath(key as string)
      queryParams[`cursor__${key as string}`] = column ? qb.connection.driver.preparePersistentValue(cursor[key], column) : cursor[key]
    }

    qb.andWhere(`(${queryParts.join(' OR ')})`, queryParams)
  }

  _createCursor(node: TEntity): Cursor<TEntity> {
    const cursor = {} as Cursor<TEntity>
    for (const [key, _] of this.orders) {
      cursor[key] = node[key]
    }
    return cursor
  }
}
