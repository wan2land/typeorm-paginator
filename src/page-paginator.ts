import { SelectQueryBuilder, ObjectType } from 'typeorm'

import { OrderBy, ColumnNameMap, PromisePagePagination, PagePagination, Nullable, Take } from './interfaces/paginator'


function normalizeOrderBy<TEntity>(orderBy: OrderBy<TEntity> | OrderBy<TEntity>[]): [keyof TEntity, boolean][] {
  const orders = [] as [keyof TEntity, boolean][]
  for (const order of Array.isArray(orderBy) ? orderBy : [orderBy]) {
    for (const [key, value] of Object.entries(order)) {
      orders.push([key as keyof TEntity, value as boolean])
    }
  }
  return orders
}

export interface PagePaginatorParams<TEntity> {
  orderBy: OrderBy<TEntity> | OrderBy<TEntity>[]
  columnNames?: ColumnNameMap<TEntity> | null
  take?: Nullable<Take> | number | null
}

export interface PagePaginatorPaginateParams<TEntity> {
  page?: number | null
  take?: number | null
  orderBy?: OrderBy<TEntity> | OrderBy<TEntity>[]
}

export class PagePaginator<TEntity> {
  orderBy: OrderBy<TEntity> | OrderBy<TEntity>[]
  columnNames: ColumnNameMap<TEntity>
  takeOptions: Take

  constructor(
    public entity: ObjectType<TEntity>,
    {
      orderBy,
      columnNames,
      take,
    }: PagePaginatorParams<TEntity>,
  ) {
    this.orderBy = orderBy
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
  }

  async paginate(qb: SelectQueryBuilder<TEntity>, params: PagePaginatorPaginateParams<TEntity> = {}): Promise<PagePagination<TEntity>> {
    const page = Math.max(params.page ?? 1, 1)
    const take = Math.max(this.takeOptions.min, Math.min(params.take || this.takeOptions.default, this.takeOptions.max))

    for (const [key, value] of normalizeOrderBy(params.orderBy ?? this.orderBy)) {
      qb.addOrderBy(this.columnNames[key] ?? `${qb.alias}.${key}`, value ? 'ASC' : 'DESC')
    }

    const qbForCount = qb.clone()

    let hasNext = false
    const nodes = await qb.clone().offset((page - 1) * take).limit(take + 1).getMany().then(nodes => {
      if (nodes.length > take) {
        hasNext = true
      }
      return nodes.slice(0, take)
    })

    return {
      count: await qbForCount.getCount(),
      nodes,
      hasNext,
    }
  }

  promisePaginate(qb: SelectQueryBuilder<TEntity>, params: PagePaginatorPaginateParams<TEntity> = {}): PromisePagePagination<TEntity> {
    const page = Math.max(params.page ?? 1, 1)
    const take = Math.max(this.takeOptions.min, Math.min(params.take || this.takeOptions.default, this.takeOptions.max))

    for (const [key, value] of normalizeOrderBy(params.orderBy ?? this.orderBy)) {
      qb.addOrderBy(this.columnNames[key] ?? `${qb.alias}.${key}`, value ? 'ASC' : 'DESC')
    }

    const qbForCount = qb.clone()
    const promiseNodes = qb.clone().offset((page - 1) * take).limit(take + 1).getMany().then(nodes => {
      let hasNext = false
      if (nodes.length > take) {
        hasNext = true
      }
      return {
        hasNext,
        nodes: nodes.slice(0, take),
      }
    })

    return {
      get count() {
        return qbForCount.getCount()
      },
      get nodes() {
        return promiseNodes.then(({ nodes }) => nodes)
      },
      get hasNext() {
        return promiseNodes.then(({ hasNext }) => hasNext)
      },
    }
  }
}
