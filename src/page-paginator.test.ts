import { Column, Connection, createConnection, Entity, PrimaryGeneratedColumn } from 'typeorm'

import { PagePagination, PromisePagePagination } from '.'
import { PagePaginator } from './page-paginator'


@Entity({ name: 'users' })
class User {
  @PrimaryGeneratedColumn()
  id!: string | number

  @Column({ type: String, name: 'user_name' })
  name!: string
}


function testPromisePaginationAndResolve(pagination: PromisePagePagination<any>): Promise<PagePagination<any>> {
  expect(pagination.count).toBeInstanceOf(Promise)
  expect(pagination.hasNext).toBeInstanceOf(Promise)
  expect(pagination.nodes).toBeInstanceOf(Promise)

  return Promise.resolve().then(async () => ({
    count: await pagination.count,
    nodes: await pagination.nodes,
    hasNext: await pagination.hasNext,
  }))
}

describe('testsuite of page-paginator', () => {
  let connection: Connection

  beforeAll(async () => {
    connection = await createConnection({
      type: 'sqlite',
      database: ':memory:',
      entities: [
        User,
      ],
      synchronize: true,
    })
  })

  beforeEach(async () => {
    await connection.getRepository(User).clear()
  })

  it('test paginate default', async () => {
    const repoUsers = connection.getRepository(User)

    const nodes = [
      repoUsers.create({ name: 'a' }),
      repoUsers.create({ name: 'b' }),
      repoUsers.create({ name: 'b' }),
      repoUsers.create({ name: 'c' }),
      repoUsers.create({ name: 'c' }),
      repoUsers.create({ name: 'c' }),
    ]

    await repoUsers.save(nodes)

    const paginator = new PagePaginator(User, {
      orderBy: {
        id: false,
      },
    })

    const pagination = await paginator.paginate(repoUsers.createQueryBuilder())
    expect(pagination).toEqual({
      count: 6,
      nodes: [
        nodes[5],
        nodes[4],
        nodes[3],
        nodes[2],
        nodes[1],
        nodes[0],
      ],
      hasNext: false,
    })
  })

  it('test page paginate by single-order', async () => {
    const repoUsers = connection.getRepository(User)

    const nodes = [
      repoUsers.create({ name: 'a' }),
      repoUsers.create({ name: 'b' }),
      repoUsers.create({ name: 'b' }),
      repoUsers.create({ name: 'c' }),
      repoUsers.create({ name: 'c' }),
      repoUsers.create({ name: 'c' }),
    ]

    await repoUsers.save(nodes)

    const paginator = new PagePaginator(User, {
      orderBy: {
        id: false,
      },
      take: 3,
    })

    const pagination = await paginator.paginate(repoUsers.createQueryBuilder())
    expect(pagination).toEqual({
      count: 6,
      nodes: [
        nodes[5],
        nodes[4],
        nodes[3],
      ],
      hasNext: true,
    })

    const paginationNext = await paginator.paginate(repoUsers.createQueryBuilder(), { page: 2 })
    expect(paginationNext).toEqual({
      count: 6,
      nodes: [
        nodes[2],
        nodes[1],
        nodes[0],
      ],
      hasNext: false,
    })


    const paginationNextNext = await paginator.paginate(repoUsers.createQueryBuilder(), { page: 3 })
    expect(paginationNextNext).toEqual({
      count: 6,
      nodes: [
      ],
      hasNext: false,
    })
  })

  it('test page paginate by multi-orders', async () => {
    const repoUsers = connection.getRepository(User)

    const nodes = [
      repoUsers.create({ name: 'c' }),
      repoUsers.create({ name: 'b' }),
      repoUsers.create({ name: 'a' }),
      repoUsers.create({ name: 'c' }),
      repoUsers.create({ name: 'b' }),
      repoUsers.create({ name: 'c' }),
    ]

    await repoUsers.save(nodes)

    const paginator = new PagePaginator(User, {
      orderBy: [
        { name: true },
        { id: false },
      ],
    })

    const pagination1 = await paginator.paginate(repoUsers.createQueryBuilder())
    expect(pagination1).toEqual({
      count: 6,
      nodes: [
        nodes[2],
        nodes[4],
        nodes[1],
        nodes[5],
        nodes[3],
        nodes[0],
      ],
      hasNext: false,
    })

    const pagination2 = await paginator.paginate(repoUsers.createQueryBuilder(), { take: 2 })
    expect(pagination2).toEqual({
      count: 6,
      nodes: [
        nodes[2],
        nodes[4],
      ],
      hasNext: true,
    })

    const pagination2Next = await paginator.paginate(repoUsers.createQueryBuilder(), { take: 2, page: 2 })
    expect(pagination2Next).toEqual({
      count: 6,
      nodes: [
        nodes[1],
        nodes[5],
      ],
      hasNext: true,
    })

    const pagination2NextNext = await paginator.paginate(repoUsers.createQueryBuilder(), { take: 2, page: 3 })
    expect(pagination2NextNext).toEqual({
      count: 6,
      nodes: [
        nodes[3],
        nodes[0],
      ],
      hasNext: false,
    })
  })

  it('test page paginate by custom column name', async () => {
    const repoUsers = connection.getRepository(User)

    const nodes = [
      repoUsers.create({ name: 'c' }),
      repoUsers.create({ name: 'b' }),
      repoUsers.create({ name: 'a' }),
      repoUsers.create({ name: 'c' }),
      repoUsers.create({ name: 'b' }),
      repoUsers.create({ name: 'c' }),
    ]

    await repoUsers.save(nodes)

    const paginator = new PagePaginator(User, {
      columnNames: {
        customName: 'User_name',
      },
      orderBy: [
        { id: false },
      ],
    })

    const pagination1 = await paginator.paginate(repoUsers.createQueryBuilder(), {
      orderBy: [
        { customName: true },
        { id: false },
      ],
    })
    expect(pagination1).toEqual({
      count: 6,
      nodes: [
        nodes[2],
        nodes[4],
        nodes[1],
        nodes[5],
        nodes[3],
        nodes[0],
      ],
      hasNext: false,
    })
  })

  it('test promisePaginate default', async () => {
    const repoUsers = connection.getRepository(User)

    const nodes = [
      repoUsers.create({ name: 'a' }),
      repoUsers.create({ name: 'b' }),
      repoUsers.create({ name: 'b' }),
      repoUsers.create({ name: 'c' }),
      repoUsers.create({ name: 'c' }),
      repoUsers.create({ name: 'c' }),
    ]

    await repoUsers.save(nodes)

    const paginator = new PagePaginator(User, {
      orderBy: {
        id: false,
      },
    })

    const pagination = await testPromisePaginationAndResolve(paginator.promisePaginate(repoUsers.createQueryBuilder()))
    expect(pagination).toEqual({
      count: 6,
      nodes: [
        nodes[5],
        nodes[4],
        nodes[3],
        nodes[2],
        nodes[1],
        nodes[0],
      ],
      hasNext: false,
    })
  })

  it('test page promisePaginate by single-order', async () => {
    const repoUsers = connection.getRepository(User)

    const nodes = [
      repoUsers.create({ name: 'a' }),
      repoUsers.create({ name: 'b' }),
      repoUsers.create({ name: 'b' }),
      repoUsers.create({ name: 'c' }),
      repoUsers.create({ name: 'c' }),
      repoUsers.create({ name: 'c' }),
    ]

    await repoUsers.save(nodes)

    const paginator = new PagePaginator(User, {
      orderBy: {
        id: false,
      },
      take: 3,
    })

    const pagination = await testPromisePaginationAndResolve(paginator.promisePaginate(repoUsers.createQueryBuilder()))
    expect(pagination).toEqual({
      count: 6,
      nodes: [
        nodes[5],
        nodes[4],
        nodes[3],
      ],
      hasNext: true,
    })

    const paginationNext = await testPromisePaginationAndResolve(paginator.promisePaginate(repoUsers.createQueryBuilder(), { page: 2 }))
    expect(paginationNext).toEqual({
      count: 6,
      nodes: [
        nodes[2],
        nodes[1],
        nodes[0],
      ],
      hasNext: false,
    })


    const paginationNextNext = await testPromisePaginationAndResolve(paginator.promisePaginate(repoUsers.createQueryBuilder(), { page: 3 }))
    expect(paginationNextNext).toEqual({
      count: 6,
      nodes: [
      ],
      hasNext: false,
    })
  })

  it('test page promisePaginate by multi-orders', async () => {
    const repoUsers = connection.getRepository(User)

    const nodes = [
      repoUsers.create({ name: 'c' }),
      repoUsers.create({ name: 'b' }),
      repoUsers.create({ name: 'a' }),
      repoUsers.create({ name: 'c' }),
      repoUsers.create({ name: 'b' }),
      repoUsers.create({ name: 'c' }),
    ]

    await repoUsers.save(nodes)

    const paginator = new PagePaginator(User, {
      orderBy: [
        { name: true },
        { id: false },
      ],
    })

    const pagination1 = await testPromisePaginationAndResolve(paginator.promisePaginate(repoUsers.createQueryBuilder()))
    expect(pagination1).toEqual({
      count: 6,
      nodes: [
        nodes[2],
        nodes[4],
        nodes[1],
        nodes[5],
        nodes[3],
        nodes[0],
      ],
      hasNext: false,
    })

    const pagination2 = await testPromisePaginationAndResolve(paginator.promisePaginate(repoUsers.createQueryBuilder(), { take: 2 }))
    expect(pagination2).toEqual({
      count: 6,
      nodes: [
        nodes[2],
        nodes[4],
      ],
      hasNext: true,
    })

    const pagination2Next = await testPromisePaginationAndResolve(paginator.promisePaginate(repoUsers.createQueryBuilder(), { take: 2, page: 2 }))
    expect(pagination2Next).toEqual({
      count: 6,
      nodes: [
        nodes[1],
        nodes[5],
      ],
      hasNext: true,
    })

    const pagination2NextNext = await testPromisePaginationAndResolve(paginator.promisePaginate(repoUsers.createQueryBuilder(), { take: 2, page: 3 }))
    expect(pagination2NextNext).toEqual({
      count: 6,
      nodes: [
        nodes[3],
        nodes[0],
      ],
      hasNext: false,
    })
  })

  it('test page promisePaginate by custom column name', async () => {
    const repoUsers = connection.getRepository(User)

    const nodes = [
      repoUsers.create({ name: 'c' }),
      repoUsers.create({ name: 'b' }),
      repoUsers.create({ name: 'a' }),
      repoUsers.create({ name: 'c' }),
      repoUsers.create({ name: 'b' }),
      repoUsers.create({ name: 'c' }),
    ]

    await repoUsers.save(nodes)

    const paginator = new PagePaginator(User, {
      columnNames: {
        customName: 'User_name',
      },
      orderBy: [
        { id: false },
      ],
    })

    const pagination1 = await testPromisePaginationAndResolve(paginator.promisePaginate(repoUsers.createQueryBuilder(), {
      orderBy: [
        { customName: true },
        { id: false },
      ],
    }))
    expect(pagination1).toEqual({
      count: 6,
      nodes: [
        nodes[2],
        nodes[4],
        nodes[1],
        nodes[5],
        nodes[3],
        nodes[0],
      ],
      hasNext: false,
    })
  })
})
