import { Unsearch } from '../types.js'
import { algoliasearch } from 'algoliasearch'
import type { Algoliasearch, SearchResponse, SearchResponses } from 'algoliasearch'

export interface AlgoliaCredentials {
  appId: string
  apiKey: string
}

export class Algolia<T extends Unsearch.DocumentBase> implements Unsearch.Adapter<T> {
  #index: string
  #client: Algoliasearch
  #pageSize: number

  constructor({index, pageSize, credentials}: {index: string, pageSize?: number, credentials: AlgoliaCredentials}) {
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

    return deserialize<T>(result as T & {objectID: string})
  }

  async search(query: string, options?: Unsearch.Options): Promise<Unsearch.Result<T>> {
    const { results } = await this.#client.search<T>({
      requests: [
        {
          indexName: this.#index,
          query,
          page: +(options?.page || 0),
          hitsPerPage: this.#pageSize
        }
      ]
    })
    
    const result = results[0] as SearchResponse<T>
    const total_records = result.nbHits || 0

    return {
      query,
      sort: [],
      records: result.hits,
      page: result.page || 0,
      total: {
        pages: Math.ceil(total_records / this.#pageSize),
        records: total_records
      }
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

  async swap(newIndex: string): Promise<void> {
    await this.#client.moveIndex(this.#index, newIndex)
  }

  async clear(): Promise<void> {
    await this.#client.clearObjects({
      indexName: this.#index
    })
  }
}

function serialize<T extends Unsearch.DocumentBase>(doc: T): { objectID: string } & T {
  return {
    objectID: doc.id,
    ...doc
  }
}

function deserialize<T extends Unsearch.DocumentBase>(doc: T & { objectID: string }): T {
  return {
    ...doc,
    id: doc.objectID
  } as T
}
