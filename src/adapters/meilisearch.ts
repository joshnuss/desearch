import { Unsearch } from '../types.js'
import { MeiliSearch } from 'meilisearch'
import type { Index } from 'meilisearch'

export interface MeiliSearchCredentials {
  host: string
  apiKey: string
}

class Adapter<T extends Unsearch.DocumentBase> implements Unsearch.Adapter<T> {
  #indexName: string
  #client: MeiliSearch
  #pageSize: number

  constructor({index, pageSize, credentials}: {index: string, pageSize?: number, credentials: MeiliSearchCredentials}) {
    this.#indexName = index
    this.#pageSize = pageSize || 10
    this.#client = new MeiliSearch(credentials)
  }

  async get(id: string): Promise<T | null> {
    const result = await this.#index().getDocument(id) as T

    if (!result) return null

    return deserialize(result)
  }

  async submit(docs: T[]): Promise<void> {
    await this.#index().addDocuments(docs)
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
    const results = await this.#index().search(query, {
      page: +(options?.page || 0),
      hitsPerPage: this.#pageSize
    })

    const total_records = results.totalHits

    console.log(results.hits)

    return {
      query,
      sort: [],
      records: (results.hits as T[]).map(deserialize),
      page: (results.page || 1) - 1,
      total: {
        pages: Math.ceil(total_records / this.#pageSize),
        records: total_records
      }
    }
  }

  #index(): Index {
    return this.#client.index(this.#indexName)
  }
}

function deserialize<T extends Unsearch.DocumentBase>(doc: T): T {
  return {
    ...doc,
    id: doc.id.replace(/-/g, '/')
  }
}

export { Adapter as MeiliSearch }
