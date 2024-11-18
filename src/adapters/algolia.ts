import type { Adapter, DocumentBase, SearchOptions, SearchResult, SortField } from '../types.js'
import { algoliasearch } from 'algoliasearch'
import type { Algoliasearch, SearchResponse } from 'algoliasearch'

export interface AlgoliaCredentials {
  appId: string
  apiKey: string
}

export class Algolia<T extends DocumentBase> implements Adapter<T> {
  #index: string
  #client: Algoliasearch
  #pageSize: number

  constructor({
    index,
    pageSize,
    credentials
  }: {
    index: string
    pageSize?: number
    credentials: AlgoliaCredentials
  }) {
    this.#index = index
    this.#pageSize = pageSize || 10
    this.#client = algoliasearch(credentials.appId, credentials.apiKey)
  }

  async get(id: string): Promise<T | null> {
    const result = await this.#client.getObject({
      indexName: this.#index,
      objectID: id
    })

    if (!result) return null

    return deserialize<T>(result)
  }

  async search(query: string, options: SearchOptions): Promise<SearchResult<T>> {
    const { page, facets, filters, sort } = options
    const { results } = await this.#client.search<T>({
      requests: [
        {
          indexName: this.#index,
          query,
          page,
          hitsPerPage: this.#pageSize,
          facets,
          customRanking: ranking_keys(sort)
        }
      ]
    })

    const result = results[0] as SearchResponse<T>
    const total_records = result.nbHits || 0

    return {
      query,
      sort,
      records: result.hits.map<T>(deserialize),
      page: result.page || 0,
      total: {
        pages: result.nbPages || 0,
        records: total_records
      },
      facets: result.facets || {},
      filters
    }
  }

  async submit(docs: T[]): Promise<void> {
    await this.#client.saveObjects({
      indexName: this.#index,
      objects: docs.map(serialize)
    })
  }

  async delete(id: string): Promise<void> {
    await this.#client.deleteObject({
      indexName: this.#index,
      objectID: id
    })
  }

  async swap(new_index: string): Promise<void> {
    await this.#client.operationIndex({
      indexName: this.#index,
      operationIndexParams: {
        operation: 'move',
        destination: new_index,
        scope: ['rules', 'settings']
      }
    })
  }

  async clear(): Promise<void> {
    await this.#client.clearObjects({
      indexName: this.#index
    })
  }
}

function serialize<T extends DocumentBase>(doc: T): T & { objectID: string } {
  return {
    objectID: doc.id,
    ...doc
  }
}

function deserialize<T extends DocumentBase>(doc: Record<string, unknown | undefined>): T {
  return {
    ...doc,
    id: doc.objectID
  } as T
}

function ranking_keys(sort: SortField[]): string[] {
  return sort.map((order) => {
    return `${order.direction}(${order.field})`
  })
}
