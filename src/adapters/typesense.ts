import type * as Unsearch from '../types.js'
import { Client } from 'typesense'
import type { ConfigurationOptions } from 'typesense/lib/Typesense/Configuration.d.ts'
import type { DocumentSchema, SearchResponseFacetCountSchema } from 'typesense/lib/Typesense/Documents.d.ts'

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
    const results = await this.#client.collections(this.#collectionName).documents().search({
      q: query,
      per_page: this.#pageSize,
      page: page + 1,
      sort_by: sort_to_string(sort),
      facet_by: facets
    })

    const total_records = results.found

    return {
      query,
      sort,
      records: (results.hits || []).map(hit => hit.document) as T[],
      page: (results.page || 1) - 1,
      total: {
        pages: Math.ceil(total_records / this.#pageSize),
        records: total_records
      },
      facets: extract_facets(results.facet_counts || []),
      filters
    }
  }
}

function sort_to_string(sort: Unsearch.SortField[]): string {
  return sort
    .map(option => `${option.field}:${option.direction}`)
    .join(',')
}

function extract_facets<T extends DocumentSchema>(stats: SearchResponseFacetCountSchema<T>[]): Record<string, Unsearch.FacetStats> {
  const results: Record<string, Unsearch.FacetStats> = {}

  stats.forEach(({ counts, field_name }) => {
    results[field_name as string] ||= {}

    counts.forEach(({ value, count }) => {
      results[field_name as string][value] = count
    })
  })

  return results
}
