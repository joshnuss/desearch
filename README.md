unsearch
-----------

An set of adapters for working with common search engines like [Algolia](https://algolia.com), [Meilisearch](meilisearch.com), [Typesense](https://typesense.org) and [Fuse.js](https://www.fusejs.io)

## Usage

Initialze an adapter, for example Algolia:

```javascript
import { Algolia } from 'unsearch/adapters/algolia'

const adapter = new Algolia({
  index: 'my-index-name',
  credentials: {
    appId: '...',
    apiKey: '...'
  }
})
```

Submit documents for indexes:

```javascript
const documents = [
  { id: 'welcome', path: '/welcome', content: ... },
  { id: 'getting-started', path: '/start', content: ... },
]

await adapter.submit(documents)
```

Search for matching docs:

```javascript
const matches = await adapter.search('hello')
```

## License

MIT
