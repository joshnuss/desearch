import type { Adapter, DocumentBase, SearchOptions, SearchResult, SortField } from '../types.js'
import { MeiliSearch as Client } from 'meilisearch'
import type { Index } from 'meilisearch'

export interface MeiliSearchCredentials {
  host: string
  apiKey: string
}

interface Options {
  index: string
  pageSize?: number
  credentials: MeiliSearchCredentials
}

export class MeiliSearch<T extends DocumentBase> implements Adapter<T> {
  #indexName: string
  #client: Client
  #pageSize: number

  constructor({ index, pageSize, credentials }: Options) {
    this.#indexName = index
    this.#pageSize = pageSize || 10
    this.#client = new Client(credentials)
  }

  async get(id: string): Promise<T | null> {
    id = escape_id(id)

    const result = await this.#index().getDocument(id)

    if (!result) return null

    return deserialize(result as T)
  }

  async submit(docs: T[]): Promise<void> {
    const serialized = docs.map(serialize)

    await this.#index().addDocuments(serialized)
  }

  async delete(id: string): Promise<void> {
    id = escape_id(id)

    await this.#index().deleteDocument(id)
  }

  async swap(newIndex: string): Promise<void> {
    await this.#client.swapIndexes([{ indexes: [newIndex, this.#indexName] }])
  }

  async clear(): Promise<void> {
    await this.#index().deleteAllDocuments()
  }

  async search(query: string, options: SearchOptions<T>): Promise<SearchResult<T>> {
    const { sort, page, facets, filters } = options
    const results = await this.#index().search(query, {
      page,
      sort: sort_strings(sort),
      hitsPerPage: this.#pageSize,
      facets
    })

    const total_records = results.totalHits

    return {
      query,
      sort,
      records: (results.hits as T[]).map(deserialize),
      page: (results.page || 1) - 1,
      total: {
        pages: Math.ceil(total_records / this.#pageSize),
        records: total_records
      },
      facets: results.facetDistribution || {},
      filters
    }
  }

  #index(): Index {
    return this.#client.index(this.#indexName)
  }
}

function serialize<T extends DocumentBase>(doc: T): T {
  return {
    ...doc,
    id: escape_id(doc.id)
  }
}

function deserialize<T extends DocumentBase>(doc: T): T {
  return {
    ...doc,
    id: unescape_id(doc.id)
  }
}

function escape_id(id: string): string {
  return id.replace(/\//g, '--')
}

function unescape_id(id: string): string {
  return id.replace(/--/g, '/')
}

function sort_strings(sort: SortField[]): string[] {
  return sort.map((option) => {
    return `${option.field}:${option.direction}`
  })
}
