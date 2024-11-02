unsearch
-----------

A set of adapters for working with common search engines like [Algolia](https://algolia.com), [Meilisearch](https://meilisearch.com), [Typesense](https://typesense.org) and [Fuse.js](https://www.fusejs.io)

**🚧 In active development, don't use yet 🚧**

## Usage

Initialze an adapter, for example Algolia:

```typescript
import { Algolia } from 'unsearch/adapters/algolia'

// defines schema of document
interface Document {
  id: string // id field is required

  // remaining fields can be anything
  path: string
  content: string
}

const adapter = new Algolia<Document>({
  index: 'my-index-name',
  credentials: {
    appId: '...',
    apiKey: '...'
  }
})
```

Submit documents for indexing:

```typescript
const documents: Document[] = [
  { id: 'welcome', path: '/welcome', content: ... },
  { id: 'getting-started', path: '/start', content: ... },
]

await adapter.submit(documents)
```

Search the index for matching docs:

```typescript
const matches = await adapter.search('hello')
```

Can also filter the index while searching:

```typescript
const matches = await adapter.search('hello', {
  filters: [
    or(
      eq('tags', 'js')
      eq('tags', 'rust')
    )
  ]
})
```

## License

MIT
