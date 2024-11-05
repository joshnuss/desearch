export namespace Unsearch {
  export interface SortField {
    field: string
    direction?: 'asc' | 'desc'
  }

  export type Sort = string | Array<string | SortField>

  export interface Options {
    page: number
    sort: SortField[]
    facets: string[]
  }

  export interface SoftOptions {
    page?: string | number
    sort?: Sort
    facets?: string[]
  }

  export type FacetStat = Record<string, number>

  export interface Result<T> {
    query: string
    page: number
    total: {
      pages: number
      records: number
    }
    sort: SortField[]
    records: T[]
    facets: Record<string, FacetStat>
  }

  export interface DocumentBase extends Record<string, unknown> {
    id: string
  }

  export interface Adapter<T extends DocumentBase> {
    get(id: string): Promise<T | null>
    search(query: string, options: Options): Promise<Result<T>>
    submit(docs: T[]): Promise<void>
    delete(id: string): Promise<void>
    swap(newIndex: string): Promise<void>
    clear(): Promise<void>
  }
}
