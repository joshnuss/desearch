export interface SortField {
  field: string
  direction?: 'asc' | 'desc'
}

export type Sort = string | Array<string | SortField>

export type FieldFilter<T> = {
  [Key in keyof T]?: {
    eq?: T[Key]
    neq?: T[Key]
    lt?: T[Key]
    lte?: T[Key]
    gt?: T[Key]
    gte?: T[Key]
    in?: Array<T[Key]>
    between?: [T[Key], T[Key]]
  }
}

export type AndFilter<T> = {
  and: Array<Filters<T>>
}

export type OrFilter<T> = {
  or: Array<Filters<T>>
}

export type NotFilter<T> = {
  not: Filters<T>
}

export type ConditionFilter<T> = AndFilter<T> | OrFilter<T> | NotFilter<T>
export type Filters<T> = FieldFilter<T> | ConditionFilter<T>

export interface SearchOptions<T> {
  page: number
  sort: SortField[]
  facets: string[]
  filters?: Filters<T>
}

export interface SoftSearchOptions<T> {
  page?: string | number
  sort?: Sort
  facets?: string[]
  filters?: Filters<T>
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
  filters?: Filters<T>
}

export interface DocumentBase {
  id: string
  [key: string]: unknown
}

export interface Adapter<T extends DocumentBase> {
  get(id: string): Promise<T | null>
  search(query: string, options: SearchOptions<T>): Promise<SearchResult<T>>
  submit(docs: T[]): Promise<void>
  delete(id: string): Promise<void>
  swap(newIndex: string): Promise<void>
  clear(): Promise<void>
}
