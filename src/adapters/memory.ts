import type {
  DocumentBase,
  Adapter,
  SearchOptions,
  FacetStats,
  SortField,
  SearchResult,
  Filters
} from '../types.ts'
import Fuse from 'fuse.js'

interface Options<T> {
  documents?: T[]
  pageSize?: number
  keys?: string[]
}

export class Memory<T extends DocumentBase> implements Adapter<T> {
  #documents: Record<string, T>
  #pageSize: number
  #keys: string[]

  constructor(options: Options<T> = {}) {
    this.#documents = {}
    this.#pageSize = options.pageSize || 10
    this.#keys = options.keys || []

    this.submit(options.documents || [])
  }

  async get(id: string): Promise<T | null> {
    return this.#documents[id] || null
  }

  async search(query: string, options: SearchOptions<T>): Promise<SearchResult<T>> {
    const { page, sort, filters } = options

    const docs = Object.values(this.#documents)
    const filtered = filter(docs, filters)
    const fuse = new Fuse(filtered, { keys: this.#keys })

    let results

    if (query) {
      results = fuse.search(query).map((result) => result.item)
    } else {
      results = filtered
    }

    const start = page * this.#pageSize
    const sorted = order(results, sort)
    const records = [...sorted].splice(start, this.#pageSize)
    const facets = aggregate_facets(records, options.facets)

    return {
      query,
      page,
      sort,
      records,
      facets,
      filters,
      total: {
        records: results.length,
        pages: Math.ceil(results.length / this.#pageSize)
      }
    }
  }

  async submit(docs: T[]): Promise<void> {
    docs.forEach((doc) => {
      this.#documents[doc.id] = doc
    })
  }

  async delete(id: string): Promise<void> {
    delete this.#documents[id]
  }

  async swap(): Promise<void> {}

  async clear(): Promise<void> {
    this.#documents = {}
  }
}

function order<T>(docs: T[], sort: SortField[]): T[] {
  return docs.sort((a, b) => {
    for (const { field, direction } of sort) {
      if (a[field as keyof T] < b[field as keyof T]) return direction === 'asc' ? -1 : 1
      if (a[field as keyof T] > b[field as keyof T]) return direction === 'asc' ? 1 : -1
    }

    return 0
  })
}

function filter<T>(docs: T[], filters?: Filters<T>) {
  if (!filters) return docs

  return docs.filter((doc) => match(doc, filters))
}

function match<T>(doc: T, filters: Filters<T>): boolean {
  if ('and' in filters) {
    return filters.and.every((conditions) => match(doc, conditions))
  }

  if ('or' in filters) {
    return filters.or.some((conditions) => match(doc, conditions))
  }

  if ('not' in filters) {
    return !match(doc, filters.not)
  }

  for (const field of Object.keys(filters) as [keyof Filters<T>]) {
    const matches = filters[field]

    if ('eq' in matches) {
      return doc[field] == matches['eq']
    }

    if ('neq' in matches) {
      return doc[field] != matches['neq']
    }

    if ('gt' in matches) {
      if (!matches['gt']) {
        throw new Error(`${field}.gt is not defined`)
      }

      return doc[field] > matches['gt']
    }

    if ('gte' in matches) {
      if (!matches['gte']) {
        throw new Error(`${field}.gte is not defined`)
      }

      return doc[field] >= matches['gte']
    }

    if ('lt' in matches) {
      if (!matches['lt']) {
        throw new Error(`${field}.lt is not defined`)
      }

      return doc[field] < matches['lt']
    }

    if ('lte' in matches) {
      if (!matches['lte']) {
        throw new Error(`${field}.lte is not defined`)
      }

      return doc[field] <= matches['lte']
    }

    if ('in' in matches) {
      if (!matches['in']) {
        throw new Error(`${field}.in is not defined`)
      }

      // @ts-expect-error type on in will always match
      return matches['in'].some((value) => doc[field] == value)
    }

    if ('between' in matches) {
      if (!matches['between']) {
        throw new Error(`${field}.between is not defined`)
      }

      const { between } = matches

      return doc[field] >= between[0] && doc[field] <= between[1]
    }
  }

  return true
}

function aggregate_facets<T>(docs: T[], facets: string[]): Record<string, FacetStats> {
  const results: Record<string, FacetStats> = {}

  for (const doc of docs) {
    for (const facet of facets) {
      // @ts-expect-error fixme
      const value = doc[facet]

      if (typeof value == 'undefined') continue

      if (Array.isArray(value)) {
        increment_facet_array(results, facet, value)
      } else {
        increment_facet(results, facet, value)
      }
    }
  }

  return results
}

function increment_facet_array(
  results: Record<string, FacetStats>,
  facet: string,
  values: string[]
) {
  values.forEach((value) => {
    increment_facet(results, facet, value)
  })
}

function increment_facet(results: Record<string, FacetStats>, facet: string, value: string) {
  if (!results[facet]) results[facet] = {}

  if (!results[facet][value]) {
    results[facet][value] = 1
  } else {
    results[facet][value] += 1
  }
}
