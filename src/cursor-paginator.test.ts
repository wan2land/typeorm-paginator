import { Column, Connection, createConnection, Entity, FindOperator, PrimaryGeneratedColumn } from 'typeorm'
import { CursorPaginator } from './cursor-paginator'


function timestampTransformFrom(value: any): any {
  if (value instanceof FindOperator) {
    return new FindOperator((value as any)._type, timestampTransformFrom((value as any)._value))
  }
  if (typeof value === 'function') {
    return value
  }
  if (typeof value === 'undefined') {
    return
  }
  if (value === null) {
    return null
  }
  if (typeof value === 'number') {
    return value
  }
  return ~~(new Date(value).getTime() / 1000)
}

function timestampTransformTo(value: any): any {
  if (value instanceof FindOperator) {
    const nextValue = timestampTransformTo((value as any)._value)
    return new FindOperator((value as any)._type, nextValue, (value as any)._useParameter, (value as any)._multipleParameters)
  }
  if (typeof value === 'function') {
    return value
  }
  if (typeof value === 'undefined') {
    return
  }
  if (value === null) {
    return null
  }
  return new Date(value * 1000)
}

@Entity({ name: 'users' })
class User {
  @PrimaryGeneratedColumn()
  id!: string | number

  @Column({ type: String, name: 'user_name' })
  name!: string

  @Column({
    type: 'datetime',
    name: 'created_at',
    transformer: {
      from: timestampTransformFrom,
      to: timestampTransformTo,
    },
  })
  createdAt!: number
}


describe('testsuite of cursor-paginator', () => {
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
      repoUsers.create({ name: 'a', createdAt: 1600000000 }),
      repoUsers.create({ name: 'b', createdAt: 1600000001 }),
      repoUsers.create({ name: 'b', createdAt: 1600000002 }),
      repoUsers.create({ name: 'c', createdAt: 1600000003 }),
      repoUsers.create({ name: 'c', createdAt: 1600000004 }),
      repoUsers.create({ name: 'c', createdAt: 1600000005 }),
    ]

    await repoUsers.save(nodes)

    const paginator = new CursorPaginator(User, {
      orderBy: {
        id: false,
      },
    })

    const pagination = await paginator.paginate(repoUsers.createQueryBuilder())
    expect(pagination).toEqual({
      nodes: [
        nodes[5],
        nodes[4],
        nodes[3],
        nodes[2],
        nodes[1],
        nodes[0],
      ],
      hasPrev: false,
      hasNext: false,
      nextCursor: expect.any(String),
      prevCursor: expect.any(String),
    })
  })

  it('test cursor paginate by single-order', async () => {
    const repoUsers = connection.getRepository(User)

    const nodes = [
      repoUsers.create({ name: 'a', createdAt: 1600000000 }),
      repoUsers.create({ name: 'b', createdAt: 1600000001 }),
      repoUsers.create({ name: 'b', createdAt: 1600000002 }),
      repoUsers.create({ name: 'c', createdAt: 1600000003 }),
      repoUsers.create({ name: 'c', createdAt: 1600000004 }),
      repoUsers.create({ name: 'c', createdAt: 1600000005 }),
    ]

    await repoUsers.save(nodes)

    const paginator = new CursorPaginator(User, {
      orderBy: {
        id: false,
      },
      take: 3,
    })

    const pagination = await paginator.paginate(repoUsers.createQueryBuilder())
    expect(pagination).toEqual({
      nodes: [
        nodes[5],
        nodes[4],
        nodes[3],
      ],
      hasPrev: false,
      hasNext: true,
      prevCursor: expect.any(String),
      nextCursor: expect.any(String),
    })

    const paginationPrev = await paginator.paginate(repoUsers.createQueryBuilder(), { prevCursor: pagination.prevCursor })
    expect(paginationPrev).toEqual({
      nodes: [
      ],
      hasPrev: false,
      hasNext: true,
    })

    const paginationNext = await paginator.paginate(repoUsers.createQueryBuilder(), { nextCursor: pagination.nextCursor })
    expect(paginationNext).toEqual({
      nodes: [
        nodes[2],
        nodes[1],
        nodes[0],
      ],
      hasPrev: true,
      hasNext: false,
      prevCursor: expect.any(String),
      nextCursor: expect.any(String),
    })


    const paginationNextPrev = await paginator.paginate(repoUsers.createQueryBuilder(), { prevCursor: paginationNext.prevCursor })
    expect(paginationNextPrev).toEqual({
      nodes: [
        nodes[5],
        nodes[4],
        nodes[3],
      ],
      hasPrev: false,
      hasNext: true,
      prevCursor: expect.any(String),
      nextCursor: expect.any(String),
    })

    const paginationNextNext = await paginator.paginate(repoUsers.createQueryBuilder(), { nextCursor: paginationNext.nextCursor })
    expect(paginationNextNext).toEqual({
      nodes: [
      ],
      hasPrev: true,
      hasNext: false,
    })
  })

  it('test cursor paginate by multi-orders', async () => {
    const repoUsers = connection.getRepository(User)

    const nodes = [
      repoUsers.create({ name: 'c', createdAt: 1600000000 }),
      repoUsers.create({ name: 'b', createdAt: 1600000001 }),
      repoUsers.create({ name: 'a', createdAt: 1600000002 }),
      repoUsers.create({ name: 'c', createdAt: 1600000003 }),
      repoUsers.create({ name: 'b', createdAt: 1600000004 }),
      repoUsers.create({ name: 'c', createdAt: 1600000005 }),
    ]

    await repoUsers.save(nodes)

    const paginator = new CursorPaginator(User, {
      orderBy: [
        { name: true },
        { id: false },
      ],
    })

    const pagination1 = await paginator.paginate(repoUsers.createQueryBuilder())
    expect(pagination1).toEqual({
      nodes: [
        nodes[2],
        nodes[4],
        nodes[1],
        nodes[5],
        nodes[3],
        nodes[0],
      ],
      hasPrev: false,
      hasNext: false,
      prevCursor: expect.any(String),
      nextCursor: expect.any(String),
    })

    const pagination2 = await paginator.paginate(repoUsers.createQueryBuilder(), { take: 2 })
    expect(pagination2).toEqual({
      nodes: [
        nodes[2],
        nodes[4],
      ],
      hasPrev: false,
      hasNext: true,
      prevCursor: expect.any(String),
      nextCursor: expect.any(String),
    })

    const pagination2Next = await paginator.paginate(repoUsers.createQueryBuilder(), { take: 2, nextCursor: pagination2.nextCursor })
    expect(pagination2Next).toEqual({
      nodes: [
        nodes[1],
        nodes[5],
      ],
      hasPrev: true,
      hasNext: true,
      prevCursor: expect.any(String),
      nextCursor: expect.any(String),
    })

    const pagination2NextNext = await paginator.paginate(repoUsers.createQueryBuilder(), { take: 2, nextCursor: pagination2Next.nextCursor })
    expect(pagination2NextNext).toEqual({
      nodes: [
        nodes[3],
        nodes[0],
      ],
      hasPrev: true,
      hasNext: false,
      prevCursor: expect.any(String),
      nextCursor: expect.any(String),
    })

    const pagination2NextNextPrev = await paginator.paginate(repoUsers.createQueryBuilder(), { take: 2, prevCursor: pagination2NextNext.prevCursor })
    expect(pagination2NextNextPrev).toEqual({
      nodes: [
        nodes[1],
        nodes[5],
      ],
      hasPrev: true,
      hasNext: true,
      prevCursor: expect.any(String),
      nextCursor: expect.any(String),
    })
  })

  it('test cursor paginate with transformer', async () => {
    const repoUsers = connection.getRepository(User)

    const nodes = [
      repoUsers.create({ name: 'a', createdAt: 1600000000 }),
      repoUsers.create({ name: 'b', createdAt: 1600000003 }),
      repoUsers.create({ name: 'b', createdAt: 1600000005 }),
      repoUsers.create({ name: 'c', createdAt: 1600000002 }),
      repoUsers.create({ name: 'c', createdAt: 1600000004 }),
      repoUsers.create({ name: 'c', createdAt: 1600000001 }),
    ]

    await repoUsers.save(nodes)

    const paginator = new CursorPaginator(User, {
      orderBy: {
        createdAt: false,
      },
      take: 3,
    })

    const pagination = await paginator.paginate(repoUsers.createQueryBuilder())
    expect(pagination).toEqual({
      nodes: [
        nodes[2],
        nodes[4],
        nodes[1],
      ],
      hasPrev: false,
      hasNext: true,
      prevCursor: expect.any(String),
      nextCursor: expect.any(String),
    })

    const paginationPrev = await paginator.paginate(repoUsers.createQueryBuilder(), { prevCursor: pagination.prevCursor })
    expect(paginationPrev).toEqual({
      nodes: [
      ],
      hasPrev: false,
      hasNext: true,
    })

    const paginationNext = await paginator.paginate(repoUsers.createQueryBuilder(), { nextCursor: pagination.nextCursor })
    expect(paginationNext).toEqual({
      nodes: [
        nodes[3],
        nodes[5],
        nodes[0],
      ],
      hasPrev: true,
      hasNext: false,
      prevCursor: expect.any(String),
      nextCursor: expect.any(String),
    })


    const paginationNextPrev = await paginator.paginate(repoUsers.createQueryBuilder(), { prevCursor: paginationNext.prevCursor })
    expect(paginationNextPrev).toEqual({
      nodes: [
        nodes[2],
        nodes[4],
        nodes[1],
      ],
      hasPrev: false,
      hasNext: true,
      prevCursor: expect.any(String),
      nextCursor: expect.any(String),
    })

    const paginationNextNext = await paginator.paginate(repoUsers.createQueryBuilder(), { nextCursor: paginationNext.nextCursor })
    expect(paginationNextNext).toEqual({
      nodes: [
      ],
      hasPrev: true,
      hasNext: false,
    })
  })
})
