import type * as Unsearch from '../types.js'
import { Client } from 'typesense'
import type { ConfigurationOptions } from 'typesense/lib/Typesense/Configuration.d.ts'

export class TypeSense<T extends Unsearch.DocumentBase> implements Unsearch.Adapter<T> {
  #collectionName: string
  #client: Client
  #pageSize: number

  constructor({collectionName, pageSize, configuration}: {collectionName: string, pageSize?: number, configuration: ConfigurationOptions}) {
    this.#collectionName = collectionName
    this.#pageSize = pageSize || 10
    this.#client = new Client(configuration)
  }

  async get(id: string): Promise<T | null> {
    const doc = await this.#client.collections(this.#collectionName).documents(id).retrieve() as T

    if (!doc) return null

    return doc
  }

  async submit(docs: T[]): Promise<void> {
    await this.#client.collections(this.#collectionName).documents().import(docs)
  }

  async delete(id: string): Promise<void> {
    await this.#client.collections(this.#collectionName).documents(id).delete()
  }

  async swap(newCollectionName: string): Promise<void> {
    await this.#client.aliases().upsert(this.#collectionName, {
      collection_name: newCollectionName
    })
  }

  async clear(): Promise<void> {
    await this.#client.collections(this.#collectionName).documents().delete()
  }

  async search(query: string, options: Unsearch.Options): Promise<Unsearch.Result<T>> {
    const { sort, page, facets, filters } = options
    const results = await this.#collection().search(query, {
      page,
      sort: sort_to_strings(sort),
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
}

function sort_to_strings(sort: Unsearch.SortField[]): string[] {
  return sort.map(option => {
    return `${option.field}:${option.direction}`
  })
}
