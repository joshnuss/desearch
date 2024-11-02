export namespace Unsearch {
  export interface Sort {
    field: string
    direction?: 'asc' | 'desc'
  }

  export interface Options {
    page?: number | string
    sort?: string | Array<string | Sort>
  }

  export interface Result<T> {
    query: string
    page: number
    total: {
      pages: number
      records: number
    }
    sort: Sort[]
    records: T[]
  }

  export interface DocumentBase extends Record<string, unknown> {
    id: string
  }

  export interface Adapter<T extends DocumentBase> {
    get(id: string): Promise<T | null>
    search(query: string, options?: Options): Promise<Result<T>>
    submit(docs: T[]): Promise<void>
    swap(newIndex: string): Promise<void>
    clear(): Promise<void>
  }
}
