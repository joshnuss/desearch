import { Memory } from '../../src/index.js'
import type { Unsearch } from '../../src/index.js'
import { eq, neq, gt, gte, lt, lte, between, not, and, or } from '../../src/filters.js'

interface Document {
  id: string
  title: string
  category?: string
  tags?: string[]
  price: number
}

describe('memory adapter', () => {
  describe('get', () => {
    test('when doc is found', async () => {
      const adapter = new Memory<Document>({
        documents: [
          { id: 'shirt', title: 'T-Shirt', price: 20 },
          { id: 'pants', title: 'Pants', price: 40 }
        ]
      })

      const doc = await adapter.get('shirt')

      expect(doc).toEqual(
        expect.objectContaining({ id: 'shirt' })
      )
    })

    test('when doc is missing', async () => {
      const adapter = new Memory<Document>()

      const doc = await adapter.get('shirt')

      expect(doc).toEqual(null)
    })
  })

  describe('search', () => {
    const adapter = new Memory<Document>({
      keys: ['id', 'title', 'catgegory'],
      documents: [
        { id: 'shirt', category: 'shirts', title: 'T-Shirt', price: 20, tags: ['fall', 'warm', 'summer'] },
        { id: 'pants', category: 'clothing', title: 'Pants', price: 40, tags: ['fall', 'summer'] },
        { id: 'socks', category: 'clothing', title: 'Socks', price: 10, tags: ['fall'] }
      ]
    })

    describe('query', () => {
      test('when found, returns records', async () => {
        const result = await adapter.search('shirt', search_options())

        expect(result.query).toBe('shirt')

        expect(result.records).toEqual([
          expect.objectContaining({ id: 'shirt' })
        ])

        expect(result.total).toEqual({
          records: 1,
          pages: 1
        })
      })

      test('when empty, returns all records', async () => {
        const result = await adapter.search('', search_options())

        expect(result.query).toBe('')

        expect(result.records).toEqual([
          expect.objectContaining({ id: 'shirt' }),
          expect.objectContaining({ id: 'pants' }),
          expect.objectContaining({ id: 'socks' })
        ])

        expect(result.total).toEqual({
          records: 3,
          pages: 1
        })
      })

      test('when not found, returns empty records', async () => {
        const result = await adapter.search('fugazi', search_options())

        expect(result.query).toBe('fugazi')
        expect(result.records).toEqual([])
        expect(result.total).toEqual({
          records: 0,
          pages: 0
        })
      })
    })

    describe('filters', () => {
      test('eq', async () => {
        const result = await adapter.search('',
          search_options({
            filters: [eq('category', 'clothing')]
          })
        )

        expect(result.records).toEqual([
          expect.objectContaining({ id: 'pants' }),
          expect.objectContaining({ id: 'socks' })
        ])
      })

      test('neq', async () => {
        const result = await adapter.search('',
          search_options({
            filters: [neq('category', 'clothing')]
          })
        )

        expect(result.records).toEqual([
          expect.objectContaining({ id: 'shirt' })
        ])
      })

      test('gt', async () => {
        const result = await adapter.search('',
          search_options({
            filters: [gt('price', 10)]
          })
        )

        expect(result.records).toEqual([
          expect.objectContaining({ id: 'shirt' }),
          expect.objectContaining({ id: 'pants' })
        ])
      })

      test('gte', async () => {
        const result = await adapter.search('',
          search_options({
            filters: [gte('price', 20)]
          })
        )

        expect(result.records).toEqual([
          expect.objectContaining({ id: 'shirt' }),
          expect.objectContaining({ id: 'pants' })
        ])
      })

      test('lt', async () => {
        const result = await adapter.search('',
          search_options({
            filters: [lt('price', 40)]
          })
        )

        expect(result.records).toEqual([
          expect.objectContaining({ id: 'shirt' }),
          expect.objectContaining({ id: 'socks' })
        ])
      })

      test('lte', async () => {
        const result = await adapter.search('',
          search_options({
            filters: [lte('price', 20)]
          })
        )

        expect(result.records).toEqual([
          expect.objectContaining({ id: 'shirt' }),
          expect.objectContaining({ id: 'socks' })
        ])
      })

      test('between', async () => {
        const result = await adapter.search('',
          search_options({
            filters: [between('price', 10, 20)]
          })
        )

        expect(result.records).toEqual([
          expect.objectContaining({ id: 'shirt' }),
          expect.objectContaining({ id: 'socks' })
        ])
      })

      test('not', async () => {
        const result = await adapter.search('',
          search_options({
            filters: [not(eq('price', 40))]
          })
        )

        expect(result.records).toEqual([
          expect.objectContaining({ id: 'shirt' }),
          expect.objectContaining({ id: 'socks' })
        ])
      })

      test('and', async() => {
        const result = await adapter.search('',
          search_options({
            filters: [
              and(
                gte('price', 10),
                eq('category', 'clothing')
              )
            ]
          })
        )

        expect(result.records).toEqual([
          expect.objectContaining({ id: 'pants' }),
          expect.objectContaining({ id: 'socks' })
        ])
      })

      test('or', async() => {
        const result = await adapter.search('',
          search_options({
            filters: [
              or(
                eq('price', 40),
                eq('price', 10)
              )
            ]
          })
        )

        expect(result.records).toEqual([
          expect.objectContaining({ id: 'pants' }),
          expect.objectContaining({ id: 'socks' })
        ])
      })
    })

    describe('facets', () => {
      test('when facets found', async () => {
        const result = await adapter.search('',
          search_options({ facets: ['category'] })
        )

        expect(result.records.length).toEqual(3)
        expect(result.facets).toEqual({
          category: {
            clothing: 2,
            shirts: 1
          }
        })
      })

      test('when facets not found', async () => {
        const result = await adapter.search('fugazi',
          search_options({ facets: ['category'] })
        )

        expect(result.records.length).toEqual(0)
        expect(result.facets).toEqual({})
      })

      test('when multiple facets requests', async () => {
        const result = await adapter.search('',
          search_options({ facets: ['category', 'price'] })
        )

        expect(result.records.length).toEqual(3)
        expect(result.facets).toEqual({
          category: {
            clothing: 2,
            shirts: 1
          },
          price: {
            10: 1,
            20: 1,
            40: 1
          }
        })
      })

      test('when facets not found', async () => {
        const result = await adapter.search('',
          search_options({ facets: ['fugazi'] })
        )

        expect(result.records.length).toEqual(3)
        expect(result.facets).toEqual({})
      })

      test('when facet field is an array', async () => {
        const result = await adapter.search('',
          search_options({ facets: ['tags'] })
        )

        expect(result.records.length).toEqual(3)
        expect(result.facets).toEqual({
          tags: {
            fall: 3,
            summer: 2,
            warm: 1
          }
        })
      })
    })

    describe('pagination', () => {
      let adapter = new Memory<Document>({ pageSize: 5 })

      beforeAll(async () => {
        const docs = []

        for (let i=1; i<=38; i++) {
          docs.push({
            id: i
          })
        }

        await adapter.submit(docs)
      })

      test('without page param, returns first page', async () => {
        const result = await adapter.search('', search_options())

        expect(result.page).toEqual(0)
        expect(result.records).toEqual([
          {id: 1},
          {id: 2},
          {id: 3},
          {id: 4},
          {id: 5}
        ])
        expect(result.total).toEqual({
          pages: 8,
          records: 38
        })
      })

      test('with page param set to 0, returns first page', async () => {
        const result = await adapter.search('', search_options({ page: 0 }))

        expect(result.page).toEqual(0)
        expect(result.records).toEqual([
          {id: 1},
          {id: 2},
          {id: 3},
          {id: 4},
          {id: 5}
        ])
        expect(result.total).toEqual({
          pages: 8,
          records: 38
        })
      })

      test('with page param set to another number, returns that page', async () => {
        const result = await adapter.search('', search_options({ page: 1 }))

        expect(result.page).toEqual(1)
        expect(result.records).toEqual([
          {id: 6},
          {id: 7},
          {id: 8},
          {id: 9},
          {id: 10}
        ])
        expect(result.total).toEqual({
          pages: 8,
          records: 38
        })
      })

      test('with page param set to last page, returns that page', async () => {
        const result = await adapter.search('', search_options({ page: 7 }))

        expect(result.page).toEqual(7)
        expect(result.records).toEqual([
          {id: 36},
          {id: 37},
          {id: 38}
        ])
        expect(result.total).toEqual({
          pages: 8,
          records: 38
        })
      })
    })

    describe('sorting', () => {
      test('ascending', async () => {
        const result = await adapter.search('',
          search_options({
            sort: [
              { field: 'price', direction: 'asc' }
            ]
          })
        )

        expect(result.records).toEqual([
          expect.objectContaining({ price: 10 }),
          expect.objectContaining({ price: 20 }),
          expect.objectContaining({ price: 40 })
        ])
      })

      test('descending', async () => {
        const result = await adapter.search('',
          search_options({
            sort: [
              { field: 'price', direction: 'desc' }
            ]
          })
        )

        expect(result.records).toEqual([
          expect.objectContaining({ price: 40 }),
          expect.objectContaining({ price: 20 }),
          expect.objectContaining({ price: 10 })
        ])
      })

      test('with multiple keys', async () => {
        const result = await adapter.search('',
          search_options({
            sort: [
              { field: 'category', direction: 'asc' },
              { field: 'price', direction: 'desc' },
            ]
          })
        )

        expect(result.records).toEqual([
          expect.objectContaining({ category: 'clothing', price: 40 }),
          expect.objectContaining({ category: 'clothing', price: 10 }),
          expect.objectContaining({ category: 'shirts', price: 20 })
        ])
      })
    })
  })

  test('submit', async () => {
    const adapter = new Memory<Document>()

    await adapter.submit([
      { id: 'shirt', title: 'T-Shirt', price: 20 },
      { id: 'pants', title: 'Pants', price: 40 }
    ])

    let doc = await adapter.get('shirt')

    expect(doc).toEqual(
      expect.objectContaining({ id: 'shirt' })
    )

    doc = await adapter.get('pants')

    expect(doc).toEqual(
      expect.objectContaining({ id: 'pants' })
    )
  })

  describe('delete', () => {
    test('when exists', async () => {
      const adapter = new Memory<Document>({
        documents: [
          { id: 'shirt', title: 'T-Shirt', price: 20 },
        ]
      })

      await adapter.delete('shirt')

      const doc = await adapter.get('shirt')

      expect(doc).toEqual(null)
    })

    test('when missing', async () => {
      const adapter = new Memory<Document>()

      expect(adapter.delete('shirt'))
        .resolves.not.toThrowError()
    })
  })

  test('swap', async () => {
    const adapter = new Memory<Document>()

    expect(adapter.swap())
      .resolves.not.toThrowError()
  })

  test('clear', async () => {
    const adapter = new Memory<Document>({
      documents: [
        { id: 'shirt', title: 'T-Shirt', price: 20 },
        { id: 'pants', title: 'Pants', price: 40 }
      ]
    })

    await adapter.clear()

    const doc = await adapter.get('shirt')

    expect(doc).toEqual(null)
  })
})

function search_options({...options} = {}): Unsearch.Options {
  return {
    page: 0,
    sort: [],
    filters: [],
    facets: [],
    ...options
  }
}
