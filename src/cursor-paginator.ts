import { SelectQueryBuilder, ObjectType } from 'typeorm'
import { CursorPagination, Cursor, OrderBy, ColumnNameMap, CursorTransformer } from './interfaces/paginator'
import { Base64Transformer } from './transformers/base64-transformer'


export interface CursorPaginatorParams<TEntity> {
  orderBy: OrderBy<TEntity> | OrderBy<TEntity>[]
  columnNames?: ColumnNameMap<TEntity> | null
  take?: number | null
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
  take: number
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
    this.take = take ?? 20
    this.transformer = transformer ?? new Base64Transformer()
  }

  async paginate(qb: SelectQueryBuilder<TEntity>, params: CursorPaginatorPaginateParams = {}): Promise<CursorPagination<TEntity>> {
    const take = params.take ?? this.take

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
        ...nodes.length > 0 ? { prevCursor: this.transformer.stringify(this._createCursor(nodes[0])) } : {},
        ...nodes.length > 0 ? { nextCursor: this.transformer.stringify(this._createCursor(nodes[nodes.length - 1])) } : {},
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
      ...nodes.length > 0 ? { prevCursor: this.transformer.stringify(this._createCursor(nodes[0])) } : {},
      ...nodes.length > 0 ? { nextCursor: this.transformer.stringify(this._createCursor(nodes[nodes.length - 1])) } : {},
    }
  }

  _applyWhereQuery(qb: SelectQueryBuilder<TEntity>, cursor: Cursor<TEntity>, isNext: boolean) {
    let queryPrefix = ''
    const queryParts = [] as string[]
    const queryParams = {} as Record<string, any>

    for (const [key, asc] of this.orders) {
      const columnName = this.columnNames[key] ?? `${qb.alias}.${key}`
      queryParts.push(`(${queryPrefix}${columnName} ${!asc !== isNext ? '>' : '<'} :cursor__${key as string})`)
      queryPrefix = `${queryPrefix}${columnName} = :cursor__${key as string} AND `
      queryParams[`cursor__${key as string}`] = cursor[key]
    }

    qb.andWhere(queryParts.join(' OR '), queryParams)
  }

  _createCursor(node: TEntity): Cursor<TEntity> {
    const cursor = {} as Cursor<TEntity>
    for (const [key, _] of this.orders) {
      cursor[key] = node[key]
    }
    return cursor
  }
}
