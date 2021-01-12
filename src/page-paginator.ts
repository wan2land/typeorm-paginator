import { SelectQueryBuilder, ObjectType } from 'typeorm'
import { OrderBy, ColumnNameMap, PagePagination, Nullable, Take } from './interfaces/paginator'


export interface PagePaginatorParams<TEntity> {
  orderBy: OrderBy<TEntity> | OrderBy<TEntity>[]
  columnNames?: ColumnNameMap<TEntity> | null
  take?: Nullable<Take> | number | null
}

export interface PagePaginatorPaginateParams {
  page?: number | null
  take?: number | null
}

export class PagePaginator<TEntity> {

  orders: [keyof TEntity, boolean][] = []
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
  }

  async paginate(qb: SelectQueryBuilder<TEntity>, params: PagePaginatorPaginateParams = {}): Promise<PagePagination<TEntity>> {
    const page = Math.max(params.page ?? 1, 1)
    const take = Math.max(this.takeOptions.min, Math.min(params.take || this.takeOptions.default, this.takeOptions.max))

    for (const [key, value] of this.orders) {
      qb.addOrderBy(this.columnNames[key] ?? `${qb.alias}.${key}`, value ? 'ASC' : 'DESC')
    }

    let hasNext = false
    const nodes = await qb.clone().offset((page - 1) * take).take(take + 1).getMany().then(nodes => {
      if (nodes.length > take) {
        hasNext = true
      }
      return nodes.slice(0, take)
    })

    return {
      nodes: nodes.slice(0, take),
      hasNext,
    }
  }
}
