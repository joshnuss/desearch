import { Unsearch } from '../types.js'
import { MeiliSearch as Client } from 'meilisearch'
import type { Index } from 'meilisearch'

export interface MeiliSearchCredentials {
  host: string
  apiKey: string
}

export class MeiliSearch<T extends Unsearch.DocumentBase> implements Unsearch.Adapter<T> {
  #indexName: string
  #client: Client
  #pageSize: number

  constructor({index, pageSize, credentials}: {index: string, pageSize?: number, credentials: MeiliSearchCredentials}) {
    this.#indexName = index
    this.#pageSize = pageSize || 10
    this.#client = new Client(credentials)
  }

  async get(id: string): Promise<T | null> {
    const result = await this.#index().getDocument(escape_id(id)) as T

    if (!result) return null

    return deserialize(result)
  }

  async submit(docs: T[]): Promise<void> {
    await this.#index().addDocuments(docs.map(serialize))
  }

  async delete(id: string): Promise<void> {
    await this.#index().deleteDocument(escape_id(id))
  }

  async swap(newIndex: string): Promise<void> {
    await this.#client.swapIndexes([
        { indexes: [ newIndex, this.#indexName ]}
    ])
  }

  async clear(): Promise<void> {
    await this.#index().deleteAllDocuments()
  }

  async search(query: string, options?: Unsearch.Options): Promise<Unsearch.Result<T>> {
    const sort = normalize_sort_keys(options?.sort || [])
    const results = await this.#index().search(query, {
      page: +(options?.page || 0),
      sort: sort_to_strings(sort),
      hitsPerPage: this.#pageSize,
      facets: options?.facets || []
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
      facets: results.facetDistribution || {}
    }
  }

  #index(): Index {
    return this.#client.index(this.#indexName)
  }
}

function serialize<T extends Unsearch.DocumentBase>(doc: T): T {
  return {
    ...doc,
    id: escape_id(doc.id)
  }
}

function deserialize<T extends Unsearch.DocumentBase>(doc: T): T {
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

function normalize_sort_keys(sort: Unsearch.Sort): Required<Unsearch.SortField>[] {
  if (typeof(sort) == 'string') {
    return [{ field: sort, direction: 'asc' }]
  }

  return sort.map(option => {
    if (typeof(option) == 'string')
      return { field: option, direction: 'asc' }

    return { field: option.field, direction: option.direction || 'asc'}
  }) as Required<Unsearch.SortField>[]
}

function sort_to_strings(sort: Required<Unsearch.SortField>[]): string[] {
  return sort.map(option => {
    return `${option.field}:${option.direction || 'asc'}`
  })
}
