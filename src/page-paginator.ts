import { SelectQueryBuilder, ObjectType } from 'typeorm'

import { OrderBy, PromisePagePagination, PagePagination, Nullable, Take } from './interfaces/paginator'
import { normalizeOrderBy } from './utils/normalizeOrderBy'


export interface PagePaginatorParams<TEntity, TColumnNames extends Record<string, string>> {
  columnNames?: TColumnNames | null
  take?: Nullable<Take> | number | null
  orderBy: OrderBy<TEntity & TColumnNames> | OrderBy<TEntity & TColumnNames>[]
}

export interface PagePaginatorPaginateParams<TEntity, TColumnNames extends Record<string, string>> {
  page?: number | null
  take?: number | null
  orderBy?: OrderBy<TEntity & TColumnNames> | OrderBy<TEntity & TColumnNames>[]
}

export class PagePaginator<TEntity, TColumnNames extends Record<string, string>> {
  orderBy: OrderBy<TEntity> | OrderBy<TEntity>[]
  columnNames: Record<string, string>
  takeOptions: Take

  constructor(
    public entity: ObjectType<TEntity>,
    {
      orderBy,
      columnNames,
      take,
    }: PagePaginatorParams<TEntity, TColumnNames>,
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

  async paginate(qb: SelectQueryBuilder<TEntity>, params: PagePaginatorPaginateParams<TEntity, TColumnNames> = {}): Promise<PagePagination<TEntity>> {
    const page = Math.max(params.page ?? 1, 1)
    const take = Math.max(this.takeOptions.min, Math.min(params.take || this.takeOptions.default, this.takeOptions.max))

    const qbForCount = qb.clone()

    for (const [key, value] of normalizeOrderBy(params.orderBy ?? this.orderBy)) {
      qb.addOrderBy(this.columnNames[key] ?? `${qb.alias}.${key}`, value ? 'ASC' : 'DESC')
    }

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

  promisePaginate(qb: SelectQueryBuilder<TEntity>, params: PagePaginatorPaginateParams<TEntity, TColumnNames> = {}): PromisePagePagination<TEntity> {
    const page = Math.max(params.page ?? 1, 1)
    const take = Math.max(this.takeOptions.min, Math.min(params.take || this.takeOptions.default, this.takeOptions.max))

    const qbForCount = qb.clone()

    for (const [key, value] of normalizeOrderBy(params.orderBy ?? this.orderBy)) {
      qb.addOrderBy(this.columnNames[key] ?? `${qb.alias}.${key}`, value ? 'ASC' : 'DESC')
    }
    const promiseNodes = () => qb.clone().offset((page - 1) * take).limit(take + 1).getMany().then(nodes => {
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
        return promiseNodes().then(({ nodes }) => nodes)
      },
      get hasNext() {
        return promiseNodes().then(({ hasNext }) => hasNext)
      },
    }
  }
}
