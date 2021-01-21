# TypeORM Paginator

<p>
  <a href="https://github.com/wan2land/typeorm-paginator/actions?query=workflow%3A%22Node.js+CI%22"><img alt="Build" src="https://img.shields.io/github/workflow/status/wan2land/typeorm-paginator/Node.js%20CI?logo=github&style=flat-square" /></a>
  <a href="https://npmcharts.com/compare/typeorm-paginator?minimal=true"><img alt="Downloads" src="https://img.shields.io/npm/dt/typeorm-paginator.svg?style=flat-square" /></a>
  <a href="https://www.npmjs.com/package/typeorm-paginator"><img alt="Version" src="https://img.shields.io/npm/v/typeorm-paginator.svg?style=flat-square" /></a>
  <a href="https://www.npmjs.com/package/typeorm-paginator"><img alt="License" src="https://img.shields.io/npm/l/typeorm-paginator.svg?style=flat-square" /></a>
  <br />
  <a href="https://david-dm.org/wan2land/typeorm-paginator"><img alt="dependencies Status" src="https://img.shields.io/david/wan2land/typeorm-paginator.svg?style=flat-square" /></a>
  <a href="https://david-dm.org/wan2land/typeorm-paginator?type=dev"><img alt="devDependencies Status" src="https://img.shields.io/david/dev/wan2land/typeorm-paginator.svg?style=flat-square" /></a>
</p>

It provides cursor-based pagination and page-based pagination. Even if there is a transformer in the column, it works perfectly.

## Installation

```bash
npm install typeorm-paginator --save
```

## Usage

### Cursor-based Pagination

```typescript
import { CursorPaginator } from 'typeorm-paginator'
```

Single cursor-based pagination.

```typescript
const paginator = new CursorPaginator(User, {
  orderBy: {
    id: false,
  },
})

const pagination = await paginator.paginate(repoUsers.createQueryBuilder())

expect(pagination).toEqual({
  nodes: [
    /*
    User { id: 3 },
    User { id: 2 },
    User { id: 1 },
    */
  ],
  hasPrev: false,
  hasNext: false,
  nextCursor: expect.any(String),
  prevCursor: expect.any(String),
})
```


Multi cursor-based pagination.

```typescript
const paginator = new CursorPaginator(User, {
  orderBy: [
    { name: true },
    { id: false },
  ],
})

const result = await paginator.paginate(repoUsers.createQueryBuilder(), { take: 2 })
expect(result).toEqual({
  nodes: [
    User { id: 3, name: 'a' },
    User { id: 5, name: 'b' },
  ],
  hasPrev: false,
  hasNext: true,
  prevCursor: expect.any(String),
  nextCursor: expect.any(String),
})

const resultNext = await paginator.paginate(repoUsers.createQueryBuilder(), { take: 2, nextCursor: result.nextCursor })
expect(resultNext).toEqual({
  nodes: [
    User { id: 2, name: 'b' },
    User { id: 6, name: 'c' },
  ],
  hasPrev: true,
  hasNext: true,
  prevCursor: expect.any(String),
  nextCursor: expect.any(String),
})

const resultNextNext = await paginator.paginate(repoUsers.createQueryBuilder(), { take: 2, nextCursor: resultNext.nextCursor })
expect(resultNextNext).toEqual({
  nodes: [
    User { id: 4, name: 'c' },
    User { id: 1, name: 'c' },
  ],
  hasPrev: true,
  hasNext: false,
  prevCursor: expect.any(String),
  nextCursor: expect.any(String),
})

const resultNextNextPrev = await paginator.paginate(repoUsers.createQueryBuilder(), { take: 2, prevCursor: resultNextNext.prevCursor })
expect(resultNextNextPrev).toEqual({
  nodes: [
    User { id: 2, name: 'b' },
    User { id: 6, name: 'c' },
  ],
  hasPrev: true,
  hasNext: true,
  prevCursor: expect.any(String),
  nextCursor: expect.any(String),
})
```


### Page-based Pagination

```typescript
import { PagePaginator } from 'typeorm-paginator'
```

Single cursor-based pagination.

```typescript
const paginator = new PagePaginator(User, {
  orderBy: {
    id: false,
  },
  take: 3,
})

const pagination1 = await paginator.paginate(repoUsers.createQueryBuilder())

expect(pagination1).toEqual({
  nodes: [
    /*
    User { id: 5 },
    User { id: 4 },
    User { id: 3 },
    */
  ],
  hasNext: true,
})

const pagination1 = await paginator.paginate(repoUsers.createQueryBuilder(), { page: 2 })

expect(pagination1).toEqual({
  nodes: [
    /*
    User { id: 2 },
    User { id: 1 },
    */
  ],
  hasNext: false,
})
```
