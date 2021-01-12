import { SelectQueryBuilder, ObjectType } from 'typeorm'
import { OrderBy, ColumnNameMap, PagePagination } from './interfaces/paginator'


export interface PagePaginatorParams<TEntity> {
  orderBy: OrderBy<TEntity> | OrderBy<TEntity>[]
  columnNames?: ColumnNameMap<TEntity>
  take?: number
}

export interface PagePaginatorPaginateParams {
  page?: number
  take?: number
}

export class PagePaginator<TEntity> {

  orders: [keyof TEntity, boolean][] = []
  columnNames: ColumnNameMap<TEntity>
  take: number

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
    this.take = take ?? 20
  }

  async paginate(qb: SelectQueryBuilder<TEntity>, params: PagePaginatorPaginateParams = {}): Promise<PagePagination<TEntity>> {
    const page = Math.max(params.page ?? 1, 1)
    const take = params.take ?? this.take

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
