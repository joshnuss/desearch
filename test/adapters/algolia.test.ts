import { Algolia } from '../../src/index.js'
import type { SearchOptions, DocumentBase } from '../../src/index.js'

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
  search: vi.fn()
}

interface Document extends DocumentBase {
  id: string
  title: string
  priority?: number
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

  describe('search', () => {
    describe('query', () => {
      test('with results', async () => {
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

      test('without results', async () => {
        client.search.mockResolvedValue({
          results: [
            {
              hits: [],
              nbHits: undefined,
              nbPages: 0,
              page: 0
            }
          ]
        })

        const result = await adapter.search('some query', search_options())

        expect(result.query).toEqual('some query')
        expect(result.records).toEqual([])
        expect(result.page).toEqual(0)
        expect(result.total).toEqual({
          pages: 0,
          records: 0
        })
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

      expect(client.search).toBeCalledWith({
        requests: [
          expect.objectContaining({
            indexName: 'fake-index',
            query: 'some query',
            customRanking: ['asc(title)', 'desc(id)']
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

    describe('filtering', () => {
      beforeEach(() => {
        client.search.mockResolvedValue({
          results: [
            {
              hits: [{ objectID: 'guides/svelte', title: 'Svelte', priority: 10 }],
              page: 2,
              nbHits: 49,
              nbPages: 5,
              facets: {}
            }
          ]
        })
      })

      const filters = {
        multiple: {
          values: {
            filters: {
              title: { eq: 'Svelte' },
              priority: { gt: 10 }
            },
            actual: 'title:Svelte AND priority > 10'
          }
        },
        eq: {
          string: {
            filters: { title: { eq: 'Svelte' } },
            actual: 'title:Svelte'
          },
          number: {
            filters: { priority: { eq: 1 } },
            actual: 'priority:1'
          }
        },
        neq: {
          string: {
            filters: { title: { neq: 'Svelte' } },
            actual: 'NOT title:Svelte'
          },
          number: {
            filters: { priority: { neq: 1 } },
            actual: 'NOT priority:1'
          }
        },
        lt: {
          string: {
            filters: { title: { lt: 'Svelte' } },
            actual: 'title > Svelte'
          },
          number: {
            filters: { priority: { lt: 1 } },
            actual: 'priority > 1'
          }
        },
        lte: {
          string: {
            filters: { title: { lte: 'Svelte' } },
            actual: 'title >= Svelte'
          },
          number: {
            filters: { priority: { lte: 1 } },
            actual: 'priority >= 1'
          }
        },
        gt: {
          string: {
            filters: { title: { gt: 'Svelte' } },
            actual: 'title > Svelte'
          },
          number: {
            filters: { priority: { gt: 1 } },
            actual: 'priority > 1'
          }
        },
        gte: {
          string: {
            filters: { title: { gte: 'Svelte' } },
            actual: 'title >= Svelte'
          },
          number: {
            filters: { priority: { gte: 1 } },
            actual: 'priority >= 1'
          }
        },
        in: {
          string: {
            filters: { title: { in: ['Svelte', 'React'] } },
            actual: 'title:Svelte OR title:React'
          },
          number: {
            filters: { priority: { in: [1, 2] } },
            actual: 'priority:1 OR priority:2'
          }
        },
        between: {
          string: {
            filters: { title: { between: ['a', 'z'] } },
            actual: 'title:a TO z'
          },
          number: {
            filters: { priority: { between: [1, 10] } },
            actual: 'priority:1 TO 10'
          }
        },
        conditions: {
          and: {
            filters: {
              and: [{ title: { eq: 'Svelte' }, priority: { gt: 10 } }, { priority: { eq: 1 } }]
            },
            actual: '(title:Svelte AND priority > 10) AND (priority:1)'
          },
          or: {
            filters: {
              or: [{ title: { eq: 'Svelte' }, priority: { gt: 10 } }, { priority: { eq: 1 } }]
            },
            actual: '(title:Svelte AND priority > 10) OR (priority:1)'
          },
          not: {
            filters: {
              not: {
                title: { eq: 'Svelte' },
                priority: { gt: 10 }
              }
            },
            actual: 'NOT title:Svelte AND priority > 10'
          }
        }
      }

      Object.entries(filters).forEach(([key, tests]) => {
        describe(key, () => {
          Object.entries(tests).forEach(([key, { filters, actual }]) => {
            test(key, async () => {
              const result = await adapter.search('some query', search_options({ filters }))

              expect(client.search).toBeCalledWith({
                requests: [
                  expect.objectContaining({
                    indexName: 'fake-index',
                    query: 'some query',
                    filters: actual
                  })
                ]
              })

              expect(result.filters).toEqual(filters)
            })
          })
        })
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
      indexName: 'fake-index'
    })
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
