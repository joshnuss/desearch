import { TypeSense } from '../../src/index.js'
import type { SearchOptions, DocumentBase } from '../../src/index.js'

vi.mock('typesense', () => {
  return {
    Client: vi.fn(() => client)
  }
})

const client = {
  collections: vi.fn(),
  aliases: vi.fn()
}

const collection = {
  documents: vi.fn()
}

const documents = {
  retrieve: vi.fn(),
  import: vi.fn(),
  delete: vi.fn(),
  search: vi.fn()
}

const aliases = {
  upsert: vi.fn()
}

interface Document extends DocumentBase {
  id: string
  title: string
}

describe('typesense', () => {
  const adapter = new TypeSense<Document>({
    collectionName: 'fake-index',
    configuration: {
      nodes: [],
      apiKey: 'fake-key'
    }
  })

  beforeEach(() => {
    vi.resetAllMocks()
    client.collections.mockReturnValue(collection)
    collection.documents.mockReturnValue(documents)
  })

  describe('get', () => {
    test('when found', async () => {
      documents.retrieve.mockResolvedValue({
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

      expect(client.collections).toBeCalledWith('fake-index')
      expect(collection.documents).toBeCalledWith('guides/start')
      expect(documents.retrieve).toBeCalled()
    })

    test('when missing', async () => {
      documents.retrieve.mockResolvedValue(null)

      const doc = await adapter.get('fugazi')

      expect(doc).toEqual(null)

      expect(client.collections).toBeCalledWith('fake-index')
      expect(collection.documents).toBeCalledWith('fugazi')
      expect(documents.retrieve).toBeCalled()
    })
  })

  // TODO: search (+query, +facets, filters, +sort, +pagination)
  describe('search', () => {
    beforeEach(() => {
      collection.documents.mockReturnValue(documents)
    })

    describe('query', () => {
      test('when found', async () => {
        documents.search.mockResolvedValue({
          hits: [
            { document: { id: 'guides/react', title: 'React' } },
            { document: { id: 'guides/svelte', title: 'Svelte' } }
          ],
          found: 50,
          page: 1
        })

        const result = await adapter.search('some query', search_options())

        expect(documents.search).toBeCalledWith(expect.objectContaining({ q: 'some query' }))

        expect(result.query).toEqual('some query')

        expect(result.records).toEqual([
          expect.objectContaining({ id: 'guides/react', title: 'React' }),
          expect.objectContaining({ id: 'guides/svelte', title: 'Svelte' })
        ])

        expect(result.facets).toEqual({})
        expect(result.page).toEqual(0)
        expect(result.total).toEqual({
          pages: 5,
          records: 50
        })
      })

      test('when not found', async () => {
        documents.search.mockResolvedValue({
          hits: undefined,
          found: 0,
          page: undefined
        })

        const result = await adapter.search('some query', search_options())

        expect(documents.search).toBeCalledWith(expect.objectContaining({ q: 'some query' }))

        expect(result.query).toEqual('some query')

        expect(result.records).toEqual([])

        expect(result.facets).toEqual({})
        expect(result.page).toEqual(0)
        expect(result.total).toEqual({
          pages: 0,
          records: 0
        })
      })
    })

    test('facets', async () => {
      documents.search.mockResolvedValue({
        hits: [
          { document: { id: 'guides/react', title: 'React' } },
          { document: { id: 'guides/svelte', title: 'Svelte' } }
        ],
        found: 50,
        page: 1,
        facet_counts: [
          {
            field_name: 'tags',
            counts: [
              { value: 'react', count: 1 },
              { value: 'svelte', count: 2 }
            ]
          },
          {
            field_name: 'date',
            counts: [
              { value: 'may', count: 4 },
              { value: 'june', count: 2 }
            ]
          }
        ]
      })

      const result = await adapter.search(
        'some query',
        search_options({ facets: ['tags', 'date'] })
      )

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

      expect(documents.search).toBeCalledWith(
        expect.objectContaining({ facet_by: ['tags', 'date'] })
      )
    })

    test('sorting', async () => {
      documents.search.mockResolvedValue({
        hits: [
          { document: { id: 'guides/react', title: 'React' } },
          { document: { id: 'guides/svelte', title: 'Svelte' } }
        ],
        found: 49,
        page: 2
      })

      const result = await adapter.search(
        'some query',
        search_options({
          sort: [
            { field: 'title', direction: 'asc' },
            { field: 'id', direction: 'desc' }
          ]
        })
      )

      expect(result.sort).toEqual([
        { field: 'title', direction: 'asc' },
        { field: 'id', direction: 'desc' }
      ])

      expect(documents.search).toBeCalledWith(
        expect.objectContaining({
          sort_by: 'title:asc,id:desc'
        })
      )
    })

    test('pagination', async () => {
      documents.search.mockResolvedValue({
        hits: [
          { document: { id: 'guides/react', title: 'React' } },
          { document: { id: 'guides/svelte', title: 'Svelte' } }
        ],
        found: 49,
        page: 2
      })

      const result = await adapter.search('some query', search_options({ page: 2 }))

      expect(result.page).toEqual(1)
      expect(result.total).toEqual({
        records: 49,
        pages: 5
      })

      expect(documents.search).toBeCalledWith(
        expect.objectContaining({
          per_page: 10,
          page: 3
        })
      )
    })
  })

  test('submit', async () => {
    documents.import.mockResolvedValue(null)

    await adapter.submit([
      { id: 'guides/svelte', title: 'Svelte' },
      { id: 'guides/react', title: 'React' },
      { id: 'guides/vue', title: 'Vue' }
    ])

    expect(documents.import).toBeCalledWith([
      expect.objectContaining({ id: 'guides/svelte', title: 'Svelte' }),
      expect.objectContaining({ id: 'guides/react', title: 'React' }),
      expect.objectContaining({ id: 'guides/vue', title: 'Vue' })
    ])
  })

  test('delete', async () => {
    documents.delete.mockResolvedValue({
      id: 'guides/start',
      title: 'Getting started'
    })

    await adapter.delete('guides/start')

    expect(collection.documents).toBeCalledWith('guides/start')
    expect(documents.delete).toBeCalled()
  })

  test('swap', async () => {
    client.aliases.mockReturnValue(aliases)
    aliases.upsert.mockResolvedValue({})

    await adapter.swap('new-index-name')

    expect(client.aliases).toBeCalled()
    expect(aliases.upsert).toBeCalledWith('fake-index', {
      collection_name: 'new-index-name'
    })
  })

  test('clear', async () => {
    documents.delete.mockResolvedValue({})

    await adapter.clear()

    expect(collection.documents).toBeCalled()
    expect(documents.delete).toBeCalled()
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
