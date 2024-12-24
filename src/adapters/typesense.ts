import type {
  Adapter,
  DocumentBase,
  SortField,
  SearchOptions,
  SearchResult,
  FacetStats,
  Filters
} from '../types.js'
import { Client } from 'typesense'
import type { ConfigurationOptions } from 'typesense/lib/Typesense/Configuration.d.ts'
import type {
  DocumentSchema,
  SearchResponseFacetCountSchema
} from 'typesense/lib/Typesense/Documents.d.ts'

interface Options {
  collectionName: string
  pageSize?: number
  configuration: ConfigurationOptions
}

export class TypeSense<T extends DocumentBase> implements Adapter<T> {
  #collectionName: string
  #client: Client
  #pageSize: number

  constructor({ collectionName, pageSize, configuration }: Options) {
    this.#collectionName = collectionName
    this.#pageSize = pageSize || 10
    this.#client = new Client(configuration)
  }

  async get(id: string): Promise<T | null> {
    const doc = (await this.#client.collections(this.#collectionName).documents(id).retrieve()) as T

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

  async search(query: string, options: SearchOptions<T>): Promise<SearchResult<T>> {
    const { sort, page, facets, filters } = options
    const results = await this.#client
      .collections(this.#collectionName)
      .documents()
      .search({
        q: query,
        per_page: this.#pageSize,
        page: page + 1,
        sort_by: sort_to_string(sort),
        facet_by: facets,
        filter_by: build_filters(filters)
      })

    const total_records = results.found

    return {
      query,
      sort,
      records: (results.hits || []).map((hit) => hit.document) as T[],
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

function sort_to_string(sort: SortField[]): string {
  return sort.map((option) => `${option.field}:${option.direction}`).join(',')
}

function extract_facets<T extends DocumentSchema>(
  stats: SearchResponseFacetCountSchema<T>[]
): Record<string, FacetStats> {
  const results: Record<string, FacetStats> = {}

  stats.forEach(({ counts, field_name }) => {
    results[field_name as string] ||= {}

    counts.forEach(({ value, count }) => {
      results[field_name as string][value] = count
    })
  })

  return results
}

function build_filters<T>(filters?: Filters<T>): string | undefined {
  if (!filters) return

  const bracket = (str: string | undefined): string => {
    return `(${str})`
  }

  if ('and' in filters) {
    return filters['and'].map(build_filters).map(bracket).join(' && ')
  }

  if ('or' in filters) {
    return filters['or'].map(build_filters).map(bracket).join(' || ')
  }

  if ('not' in filters) {
    return `NOT (${build_filters(filters['not'])})`
  }

  const conditions: string[] = []

  for (const key of Object.keys(filters)) {
    // @ts-expect-error fixme
    const match = filters[key]

    if ('eq' in match) {
      conditions.push(`${key}:${format_type(match['eq'])}`)
      continue
    }

    if ('neq' in match) {
      conditions.push(`${key}:!=${format_type(match['neq'])}`)
      continue
    }

    if ('lt' in match) {
      conditions.push(`${key}:>${format_type(match['lt'])}`)
      continue
    }

    if ('lte' in match) {
      conditions.push(`${key}:>=${format_type(match['lte'])}`)
      continue
    }

    if ('gt' in match) {
      conditions.push(`${key}:>${format_type(match['gt'])}`)
      continue
    }

    if ('gte' in match) {
      conditions.push(`${key}:>=${format_type(match['gte'])}`)
      continue
    }

    if ('in' in match) {
      conditions.push(`${key}:[${match['in'].map(format_type).join(', ')}]`)
      continue
    }

    if ('between' in match) {
      const [from, to] = match['between']
      conditions.push(`${key}:[${format_type(from)}..${format_type(to)}]`)
      continue
    }
  }

  return conditions.join(' && ')
}

function format_type(value: string | unknown): string {
  return String(value)
}
