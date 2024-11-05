import type { Unsearch } from '../types.ts'
import Fuse  from 'fuse.js'

export class Memory<T extends Unsearch.DocumentBase> implements Unsearch.Adapter<T> {
  #documents: Record<string, T>
  #pageSize: number
  #keys: string[]

  constructor({ documents = [], pageSize = 10, keys = [] }: { documents: T[], pageSize: number, keys: string[] }) {
    this.#documents = {}
    this.#pageSize = pageSize
    this.#keys = keys

    this.submit(documents)
  }

  async get(id: string): Promise<T | null> {
    return this.#documents[id]
  }

  async search(query: string, options: Unsearch.Options): Promise<Unsearch.Result<T>> {
    const { page, sort } = options
    // filter documents here
    const array = Object.values(this.#documents)
    const fuse = new Fuse(array, { keys: this.#keys })
    const results = fuse.search(query).map(result => result.item)
    const start = page * this.#pageSize
    const sorted = order(results, sort)
    const records = sorted.slice(start, this.#pageSize)

    return {
      query,
      page,
      sort,
      records,
      facets: {},
      total: {
        records: results.length,
        pages: Math.ceil(results.length / this.#pageSize)
      }
    }
  }

  async submit(docs: T[]): Promise<void> {
    docs.forEach(doc => {
      this.#documents[doc.id] = doc
    })
  }

  async delete(id: string): Promise<void> {
    delete this.#documents[id]
  }

  async swap(): Promise<void> {
  }

  async clear(): Promise<void> {
    this.#documents = {}
  }
}

function order<T>(docs: T[], sort: Unsearch.SortField[]): T[] {
  // TODO: implement sort
  return docs
}
