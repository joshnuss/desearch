import type * as filters from './filters.ts'

export interface SortField {
  field: string
  direction?: 'asc' | 'desc'
}

export type Sort = string | Array<string | SortField>

export interface SearchOptions {
  page: number
  sort: SortField[]
  facets: string[]
  filters: filters.Filter[]
}

export interface SoftSearchOptions {
  page?: string | number
  sort?: Sort
  facets?: string[]
  filters?: filters.Filter | filters.Filter[]
}

export type FacetStats = Record<string, number>

export interface SearchResult<T> {
  query: string
  page: number
  total: {
    pages: number
    records: number
  }
  sort: SortField[]
  records: T[]
  facets: Record<string, FacetStats>
  filters: filters.Filter[]
}

export interface DocumentBase {
  id: string
  [key: string]: unknown
}

export interface Adapter<T extends DocumentBase> {
  get(id: string): Promise<T | null>
  search(query: string, options: SearchOptions): Promise<SearchResult<T>>
  submit(docs: T[]): Promise<void>
  delete(id: string): Promise<void>
  swap(newIndex: string): Promise<void>
  clear(): Promise<void>
}
