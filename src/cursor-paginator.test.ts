import { Column, Connection, createConnection, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { CursorPaginator } from './cursor-paginator'


@Entity({ name: 'users' })
class User {
  @PrimaryGeneratedColumn()
  id!: string | number

  @Column({ type: String, name: 'user_name' })
  name!: string
}


describe('testsuite of paginator', () => {
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

  it('test cursor paginate by single-cursor', async () => {
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

  it('test cursor paginate by multi-cursor', async () => {
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
})
