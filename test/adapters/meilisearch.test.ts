import { MeiliSearch } from '../../src/index.js'
import type { SearchOptions, DocumentBase } from '../../src/index.js'

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

interface Document extends DocumentBase {
  id: string
  title: string
  priority?: number
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

      expect(index.search).toBeCalledWith(
        'some query',
        expect.objectContaining({
          sort: ['title:asc', 'id:desc']
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

    describe('filtering', () => {
      beforeEach(() => {
        index.search.mockResolvedValue({
          hits: [{ id: 'guides--svelte', title: 'Svelte' }],
          page: 1,
          totalHits: 49,
          facets: {}
        })
      })

      const filters = {
        multiple: {
          values: {
            filters: {
              title: { eq: 'Svelte' },
              priority: { gt: 10 }
            },
            actual: "title = 'Svelte' AND priority > 10"
          }
        },
        eq: {
          string: {
            filters: { title: { eq: 'Svelte' } },
            actual: "title = 'Svelte'"
          },
          number: {
            filters: { priority: { eq: 1 } },
            actual: 'priority = 1'
          }
        },
        neq: {
          string: {
            filters: { title: { neq: 'Svelte' } },
            actual: "title != 'Svelte'"
          },
          number: {
            filters: { priority: { neq: 1 } },
            actual: 'priority != 1'
          }
        },
        lt: {
          string: {
            filters: { title: { lt: 'Svelte' } },
            actual: "title > 'Svelte'"
          },
          number: {
            filters: { priority: { lt: 1 } },
            actual: 'priority > 1'
          }
        },
        lte: {
          string: {
            filters: { title: { lte: 'Svelte' } },
            actual: "title >= 'Svelte'"
          },
          number: {
            filters: { priority: { lte: 1 } },
            actual: 'priority >= 1'
          }
        },
        gt: {
          string: {
            filters: { title: { gt: 'Svelte' } },
            actual: "title > 'Svelte'"
          },
          number: {
            filters: { priority: { gt: 1 } },
            actual: 'priority > 1'
          }
        },
        gte: {
          string: {
            filters: { title: { gte: 'Svelte' } },
            actual: "title >= 'Svelte'"
          },
          number: {
            filters: { priority: { gte: 1 } },
            actual: 'priority >= 1'
          }
        },
        in: {
          string: {
            filters: { title: { in: ['Svelte', 'React'] } },
            actual: "title IN ['Svelte', 'React']"
          },
          number: {
            filters: { priority: { in: [1, 2] } },
            actual: 'priority IN [1, 2]'
          }
        },
        between: {
          string: {
            filters: { title: { between: ['a', 'z'] } },
            actual: "title >= 'a' AND title <= 'z'"
          },
          number: {
            filters: { priority: { between: [1, 10] } },
            actual: 'priority >= 1 AND priority <= 10'
          }
        },
        conditions: {
          and: {
            filters: {
              and: [{ title: { eq: 'Svelte' }, priority: { gt: 10 } }, { priority: { eq: 1 } }]
            },
            actual: "(title = 'Svelte' AND priority > 10) AND (priority = 1)"
          },
          or: {
            filters: {
              or: [{ title: { eq: 'Svelte' }, priority: { gt: 10 } }, { priority: { eq: 1 } }]
            },
            actual: "(title = 'Svelte' AND priority > 10) OR (priority = 1)"
          },
          not: {
            filters: {
              not: {
                title: { eq: 'Svelte' },
                priority: { gt: 10 }
              }
            },
            actual: "NOT (title = 'Svelte' AND priority > 10)"
          }
        }
      }

      Object.entries(filters).forEach(([key, tests]) => {
        describe(key, () => {
          Object.entries(tests).forEach(([key, { filters, actual }]) => {
            test(key, async () => {
              const result = await adapter.search('some query', search_options({ filters }))

              expect(index.search).toBeCalledWith(
                'some query',
                expect.objectContaining({
                  filters: actual
                })
              )

              expect(result.filters).toEqual(filters)
            })
          })
        })
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

function search_options(options: Partial<SearchOptions<Document>> = {}): SearchOptions<Document> {
  return {
    page: 0,
    facets: [],
    sort: [],
    ...options
  }
}
