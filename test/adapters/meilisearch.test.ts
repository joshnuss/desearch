import { MeiliSearch } from '../../src/index.js'
import type { SearchOptions } from '../../src/index.js'

vi.mock('meilisearch', () => {
  return {
    MeiliSearch: vi.fn(() => client)
  }
})

const client = {
  index: vi.fn(),
  swapIndexes: vi.fn()
}

const index = {
  getDocument: vi.fn(),
  addDocuments: vi.fn(),
  deleteDocument: vi.fn(),
  deleteAllDocuments: vi.fn(),
  search: vi.fn()
}

interface Document {
  id: string
  title: string
}

describe('meili', () => {
  const adapter = new MeiliSearch<Document>({
    index: 'fake-index',
    credentials: {
      host: 'fake-host',
      apiKey: 'fake-api-key'
    }
  })

  beforeEach(() => {
    vi.resetAllMocks()

    client.index.mockReturnValue(index)
  })

  describe('get', () => {
    test('when found', async () => {
      index.getDocument.mockResolvedValue({
        id: 'guides/start',
        title: 'Getting started'
      })

      const doc = await adapter.get('guides/start')

      expect(doc).toEqual(
        expect.objectContaining({
          id: 'guides/start',
          title: 'Getting started'
        })
      )

      expect(client.index).toBeCalledWith('fake-index')
      expect(index.getDocument).toBeCalledWith('guides--start')
    })

    test('when missing', async () => {
      index.getDocument.mockResolvedValue(null)

      const doc = await adapter.get('fugazi')

      expect(doc).toEqual(null)

      expect(client.index).toBeCalledWith('fake-index')
      expect(index.getDocument).toBeCalledWith('fugazi')
    })
  })

  // TODO: search (+query, +facets, filters, +sort, +pagination)
  describe('search', () => {
    test('query', async () => {
      index.search.mockResolvedValue({
        hits: [
          { id: 'guides--react', title: 'React' },
          { id: 'guides--svelte', title: 'Svelte' }
        ],
        totalHits: 50,
        page: 1
      })

      const result = await adapter.search('some query', search_options())

      expect(result.query).toEqual('some query')

      expect(result.records).toEqual([
        expect.objectContaining({ id: 'guides/react', title: 'React' }),
        expect.objectContaining({ id: 'guides/svelte', title: 'Svelte' })
      ])

      expect(result.page).toEqual(0)
      expect(result.total).toEqual({
        pages: 5,
        records: 50
      })
    })

    test('facets', async () => {
      index.search.mockResolvedValue({
        hits: [
          { id: 'guides--react', title: 'React' },
          { id: 'guides--svelte', title: 'Svelte' }
        ],
        totalHits: 50,
        facetDistribution: {
          tags: {
            react: 1,
            svelte: 2
          },
          date: {
            may: 4,
            june: 2
          }
        }
      })

      const result = await adapter.search('some query', search_options({ facets: ['tags', 'date']}))

      expect(result.facets).toEqual({
        tags: {
          react: 1,
          svelte: 2
        },
        date: {
          may: 4,
          june: 2
        }
      })
    })

    test('sorting', async () => {
      index.search.mockResolvedValue({
        hits: [
          { id: 'guides--react', title: 'React' },
          { id: 'guides--svelte', title: 'Svelte' }
        ],
        page: 2,
        totalHits: 49,
        facets: {}
      })

      const result = await adapter.search('some query',
        search_options({
          sort: [
            { field: 'title', direction: 'asc' },
            { field: 'id', direction: 'desc' }
          ]
        }))

      expect(result.sort).toEqual([
        { field: 'title', direction: 'asc' },
        { field: 'id', direction: 'desc' }
      ])

      expect(index.search).toBeCalledWith('some query',
        expect.objectContaining({
          sort: [
            'title:asc',
            'id:desc'
          ]
        })
      )
    })

    test('pagination', async () => {
      index.search.mockResolvedValue({
        hits: [
          { id: 'guides--react', title: 'React' },
          { id: 'guides--svelte', title: 'Svelte' }
        ],
        page: 2,
        totalHits: 49,
        facets: {}
      })

      const result = await adapter.search('some query', search_options({ page: 2 }))

      expect(result.page).toEqual(1)
      expect(result.total).toEqual({
        records: 49,
        pages: 5
      })
    })
  })

  test('submit', async () => {
    index.addDocuments.mockResolvedValue(null)

    await adapter.submit([
      { id: 'guides/svelte', title: 'Svelte' },
      { id: 'guides/react', title: 'React' },
      { id: 'guides/vue', title: 'Vue' }
    ])

    expect(index.addDocuments).toBeCalledWith([
      expect.objectContaining({ id: 'guides--svelte', title: 'Svelte' }),
      expect.objectContaining({ id: 'guides--react', title: 'React' }),
      expect.objectContaining({ id: 'guides--vue', title: 'Vue' })
    ])
  })

  test('delete', async () => {
    index.deleteDocument.mockResolvedValue({
      id: 'guides--start',
      title: 'Getting started'
    })

    await adapter.delete('guides/start')

    expect(index.deleteDocument).toBeCalledWith('guides--start')
  })

  test('swap', async () => {
    client.swapIndexes.mockResolvedValue(null)

    await adapter.swap('new-index-name')

    expect(client.swapIndexes).toBeCalledWith([
      {
        indexes: ['new-index-name', 'fake-index']
      }
    ])
  })

  test('clear', async () => {
    index.deleteAllDocuments.mockResolvedValue(null)

    await adapter.clear()

    expect(index.deleteAllDocuments).toBeCalled()
  })
})

function search_options(options: Partial<SearchOptions> = {}): SearchOptions {
  return {
    page: 0,
    facets: [],
    filters: [],
    sort: [],
    ...options
  }
}
