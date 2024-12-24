desearch
-----------

A set of adapters for working with common search engines like [Algolia](https://algolia.com), [Meilisearch](https://meilisearch.com), [ElasticSearch](https://www.elastic.co), [Typesense](https://typesense.org) and [Fuse.js](https://www.fusejs.io)

**🚧 In active development, don't use yet 🚧**

## Features

- Multiple adapters
- Memory
- Pagination
- Sorting
- Filtering
- Facets
- Indexing

## Usage

Initialize an index with an adapter, for example Algolia:

```typescript
import { Index, Algolia } from 'desearch'

// define schema of document
interface Document {
  id: string // id field is required

  // remaining fields can be anything
  path: string
  content: string
}

const index = new Index<Document>({
  adapter: new Algolia({
    index: 'my-index-name',
    credentials: {
      appId: '...',
      apiKey: '...'
    }
  })
})
```

Submit documents for indexing:

```typescript
const documents: Document[] = [
  { id: 'welcome', path: '/welcome', content: ... },
  { id: 'getting-started', path: '/start', content: ... },
]

await index.submit(documents)
```

Search the index for matching docs:

```typescript
const matches = await index.search('hello')
```

Can also filter while searching:

```typescript
const matches = await index.search('hello', {
  filters: {
    tags: { in: ['js', 'rust'] },
    published: { gt: new Date(2000, 1, 1) }
  }
})
```

## License

MIT
