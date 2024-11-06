import { Index } from '../index.js'
import type { Unsearch } from '../index.js'

interface Document {
  id: string
}

const adapter: Unsearch.Adapter<Document> = {
  get: vi.fn(),
  submit: vi.fn(),
  search: vi.fn(),
  delete: vi.fn(),
  swap: vi.fn(),
  clear: vi.fn(),
}

const index = new Index<Document>({ adapter })

describe('index', () => {
  beforeEach(() => vi.resetAllMocks())

  test('get', async () => {
    adapter.get.mockResolvedValue({ id: 'example' })

    const result = await index.get('example')

    expect(result).toEqual({ id: 'example' })
  })

  describe('submit', () => {
    test('single document', async () => {
      const doc = { id: '123' }

      await index.submit(doc)

      expect(adapter.submit).toBeCalledWith([{ id: '123' }])
    })

    test('multiple documents', async () => {
      const docs = [
        { id: '123' },
        { id: '456' }
      ]

      await index.submit(docs)

      expect(adapter.submit).toBeCalledWith([
        { id: '123' },
        { id: '456' }
      ])
    })

    test('no documents', async () => {
      await index.submit([])

      expect(adapter.submit).not.toBeCalled()
    })
  })

  describe('search', () => {
    test('default options', async () => {
      await index.search('query')

      expect(adapter.search).toBeCalledWith('query', {
        page: 0,
        sort: [],
        facets: []
      })
    })

    describe('page param', () => {
      test('defaults to 0', async () => {
        await index.search('query')

        expect(adapter.search).toBeCalledWith('query',
          expect.objectContaining({ page: 0 })
        )
      })

      test('converts string to number', async () => {
        await index.search('query', { page: '1' })

        expect(adapter.search).toBeCalledWith('query',
          expect.objectContaining({ page: 1 })
        )
      })
    })

    test('passes facets', async () => {
      await index.search('query', { facets: ['tags', 'author'] })

      expect(adapter.search).toBeCalledWith('query',
        expect.objectContaining({ facets: [ 'tags', 'author' ] })
      )
    })

    describe('sort', () => {
      test('single strings', async () => {
        await index.search('query', { sort: 'tags' })

        expect(adapter.search).toBeCalledWith('query',
          expect.objectContaining({
            sort: [
              { field: 'tags', direction: 'asc' },
            ]
          })
        )
      })

      test('field names as strings', async () => {
        await index.search('query', { sort: ['tags', 'author'] })

        expect(adapter.search).toBeCalledWith('query',
          expect.objectContaining({
            sort: [
              { field: 'tags', direction: 'asc' },
              { field: 'author', direction: 'asc' }
            ]
          })
        )
      })

      test('field names as objects', async () => {
        await index.search('query', {
          sort: [
            { field: 'tags', direction: 'asc' },
            { field: 'author', direction: 'desc' }
          ]
        })

        expect(adapter.search).toBeCalledWith('query',
          expect.objectContaining({
            sort: [
              { field: 'tags', direction: 'asc' },
              { field: 'author', direction: 'desc' }
            ]
          })
        )
      })
    })
  })

  test('delete', async () => {
    adapter.delete.mockResolvedValue()

    await index.delete('example')

    expect(adapter.delete).toBeCalledWith('example')
  })


  test('swap', async () => {
    adapter.swap.mockResolvedValue()

    await index.swap('new-index')

    expect(adapter.swap).toBeCalledWith('new-index')
  })

  test('clear', async () => {
    adapter.clear.mockResolvedValue()

    await index.clear()

    expect(adapter.clear).toBeCalled()
  })
})
