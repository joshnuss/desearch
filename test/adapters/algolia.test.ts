import { Algolia } from '../../src/index.js'
import { algoliasearch } from 'algoliasearch'
import type { Unsearch } from '../../src/index.js'

vi.mock('algoliasearch', () => {
  return {
    algoliasearch: () => client
  }
})

const client = {
  getObject: vi.fn(),
  deleteObject: vi.fn(),
  saveObjects: vi.fn(),
  clearObjects: vi.fn(),
  operationIndex: vi.fn(),
  search: vi.fn(),
}

interface Document {
  id: string
  title: string
}

describe('algolia', () => {
  const adapter = new Algolia<Document>({
    index: 'fake-index',
    credentials: {
      appId: 'fake-app-id',
      apiKey: 'fake-api-key'
    }
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('get', () => {
    test('when found', async () => {
      client.getObject.mockResolvedValue({
        objectID: 'guides/start',
        title: 'Getting started'
      })

      const doc = await adapter.get('guides/start')

      expect(doc).toEqual(
        expect.objectContaining({
          id: 'guides/start',
          title: 'Getting started'
        })
      )

      expect(client.getObject).toBeCalledWith({
        indexName: 'fake-index',
        objectID: 'guides/start'
      })
    })

    test('when missing', async () => {
      client.getObject.mockResolvedValue(null)

      const doc = await adapter.get('fugazi')

      expect(doc).toEqual(null)

      expect(client.getObject).toBeCalledWith({
        indexName: 'fake-index',
        objectID: 'fugazi'
      })
    })
  })

  // TODO: search (+query, +facets, filters, +sort, +pagination)
  describe('search', () => {
    test('query', async () => {
      client.search.mockResolvedValue({
        results: [
          {
            hits: [
              { objectID: 'guides/react', title: 'React' },
              { objectID: 'guides/svelte', title: 'Svelte' }
            ],
            nbHits: 50,
            nbPages: 5,
            page: 0
          }
        ]
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
      client.search.mockResolvedValue({
        results: [
          {
            hits: [
              { objectID: 'guides/react', title: 'React' },
              { objectID: 'guides/svelte', title: 'Svelte' }
            ],
            nbHits: 50,
            facets: {
              tags: {
                react: 1,
                svelte: 2
              },
              date: {
                may: 4,
                june: 2
              }
            }
          }
        ]
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
      client.search.mockResolvedValue({
        results: [
          {
            hits: [
              { objectID: 'guides/react', title: 'React' },
              { objectID: 'guides/svelte', title: 'Svelte' }
            ],
            page: 2,
            nbHits: 49,
            nbPages: 5,
            facets: {}
          }
        ]
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

      expect(client.search).toBeCalledWith({
        requests: [
          expect.objectContaining({
            indexName: 'fake-index',
            query: 'some query',
            customRanking: [
              'asc(title)',
              'desc(id)'
            ]
          })
        ]
      })
    })

    test('pagination', async () => {
      client.search.mockResolvedValue({
        results: [
          {
            hits: [
              { objectID: 'guides/react', title: 'React' },
              { objectID: 'guides/svelte', title: 'Svelte' }
            ],
            page: 2,
            nbHits: 49,
            nbPages: 5,
            facets: {}
          }
        ]
      })

      const result = await adapter.search('some query', search_options({ page: 2 }))

      expect(result.page).toEqual(2)
      expect(result.total).toEqual({
        records: 49,
        pages: 5
      })
    })
  })

  test('submit', async () => {
    client.saveObjects.mockResolvedValue(null)

    await adapter.submit([
      { id: 'guides/svelte', title: 'Svelte' },
      { id: 'guides/react', title: 'React' },
      { id: 'guides/vue', title: 'Vue' }
    ])

    expect(client.saveObjects).toBeCalledWith({
      indexName: 'fake-index',
      objects: [
        expect.objectContaining({ objectID: 'guides/svelte', title: 'Svelte' }),
        expect.objectContaining({ objectID: 'guides/react', title: 'React' }),
        expect.objectContaining({ objectID: 'guides/vue', title: 'Vue' })
      ]
    })
  })

  test('delete', async () => {
    client.deleteObject.mockResolvedValue({
      objectID: 'guides/start',
      title: 'Getting started'
    })

    await adapter.delete('guides/start')

    expect(client.deleteObject).toBeCalledWith({
      indexName: 'fake-index',
      objectID: 'guides/start'
    })
  })

  test('swap', async () => {
    client.operationIndex.mockResolvedValue(null)

    await adapter.swap('new-index-name')

    expect(client.operationIndex).toBeCalledWith({
      indexName: 'fake-index',
      operationIndexParams: {
        operation: 'move',
        destination: 'new-index-name',
        scope: ['rules', 'settings']
      }
    })
  })

  test('clear', async () => {
    client.clearObjects.mockResolvedValue(null)

    await adapter.clear()

    expect(client.clearObjects).toBeCalledWith({
      indexName: 'fake-index',
    })
  })
})

function search_options(options: Partial<Unsearch.Options> = {}): Unsearch.Options {
  return {
    page: 0,
    facets: [],
    filters: [],
    sort: [],
    ...options
  }
}
