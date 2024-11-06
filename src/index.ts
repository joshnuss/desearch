export { Algolia } from './adapters/algolia.js'
export { MeiliSearch } from './adapters/meilisearch.js'
export { Memory } from './adapters/memory.js'

import type { Unsearch } from './types.ts'

export type { Unsearch }

export class Index<T extends Unsearch.DocumentBase> {
  #adapter: Unsearch.Adapter<T>

  constructor({adapter}: {adapter: Unsearch.Adapter<T>}) {
    this.#adapter = adapter
  }

  async get(id: string): Promise<T | null> {
    return await this.#adapter.get(id)
  }

  async submit(docs_or_doc: T | T[]): Promise<void> {
    let docs: T[]

    if (Array.isArray(docs_or_doc)) {
      docs = docs_or_doc
      if (!docs.length) return
    } else {
      docs = [docs_or_doc]
    }

    await this.#adapter.submit(docs)
  }

  async search(query: string, options?: Unsearch.SoftOptions): Promise<Unsearch.Result<T>> {
    const sort = normalize_sort_keys(options?.sort || [])
    const page: number = +(options?.page || 0)
    const facets: string[] = options?.facets || []

    return await this.#adapter.search(query, {
      page,
      sort,
      facets
    })
  }

  async delete(id: string): Promise<void> {
    await this.#adapter.delete(id)
  }

  async swap(new_index: string): Promise<void> {
    await this.#adapter.swap(new_index)
  }

  async clear(): Promise<void> {
    await this.#adapter.clear()
  }
}

function normalize_sort_keys(sort: Unsearch.Sort): Required<Unsearch.SortField>[] {
  if (typeof(sort) == 'string') {
    return [{ field: sort, direction: 'asc' }]
  }

  return sort.map(option => {
    if (typeof(option) == 'string')
      return { field: option, direction: 'asc' }

    return { field: option.field, direction: option.direction || 'asc'}
  }) as Required<Unsearch.SortField>[]
}
