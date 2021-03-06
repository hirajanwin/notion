<p align="center">
  <img alt="Notion + TypeScript" src="https://raw.githubusercontent.com/saasify-sh/notion/master/notion-ts.png" width="689">
</p>

# notion

> TypeScript packages for Notion's unofficial API, data types, and related utilities.

[![NPM](https://img.shields.io/npm/v/notion-client.svg)](https://www.npmjs.com/package/notion-client) [![Build Status](https://travis-ci.com/saasify-sh/notion.svg?branch=master)](https://travis-ci.com/saasify-sh/notion) [![Prettier Code Formatting](https://img.shields.io/badge/code_style-prettier-brightgreen.svg)](https://prettier.io)

## Usage

```ts
import { NotionAPI } from 'notion-client'

const api = new NotionAPI()

// this will fetch all blocks for the given page as well as any collection data
// for collection views contained on the page
const page = await api.getPage('067dd719-a912-471e-a9a3-ac10710e7fdf')

// example of fetching the data for a specific collection instance
const collectionId = '2d8aec23-8281-4a94-9090-caaf823dd21a'
const collectionViewId = 'ab639a5a-853e-45e1-9ef7-133b486c0acf'
const colectionData = await api.getCollectionData(
  collectionId,
  collectionViewId
)
```

All examples use this public [notion workspace](https://www.notion.so/Notion-Tests-067dd719a912471ea9a3ac10710e7fdf) which **aims to cover 100% of Notion's public functionality**.

## Docs

| Package                                   | NPM                                                                                                   | Docs                            | Description                                       |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------- |
| [notion-client](./packages/notion-client) | [![NPM](https://img.shields.io/npm/v/notion-client.svg)](https://www.npmjs.com/package/notion-client) | [docs](./docs/notion-client.md) | TypeScript client for the unofficial Notion API.  |
| [notion-types](./packages/notion-types)   | [![NPM](https://img.shields.io/npm/v/notion-types.svg)](https://www.npmjs.com/package/notion-types)   | [docs](./docs/notion-types.md)  | TypeScript types for core Notion data structures. |
| [notion-utils](./packages/notion-utils)   | [![NPM](https://img.shields.io/npm/v/notion-utils.svg)](https://www.npmjs.com/package/notion-utils)   | [docs](./docs/notion-utils.md)  | Useful utilities for working with Notion data.    |

## Related

- [notion test suite](https://www.notion.so/saasifysh/Notion-Tests-067dd719a912471ea9a3ac10710e7fdf) - Comprehensive suite of public Notion pages to test individual features.
- [react-notion](https://github.com/splitbee/react-notion) - React renderer for Notion data.
- [notion-api-worker](https://github.com/splitbee/notion-api-worker) - Notion API proxy exposed as a Cloudflare Worker.
  - Currently doesn't handle collection data very robustly.
- [notion-api-agent](https://github.com/dragonman225/notionapi-agent) - Alternative Notion API client.

## License

MIT © [Travis Fischer](https://transitivebullsh.it)

Support my OSS work by <a href="https://twitter.com/transitive_bs">following me on twitter <img src="https://storage.googleapis.com/saasify-assets/twitter-logo.svg" alt="twitter" height="24px" align="center"></a>

This project extends MIT-licensed work by [Timo Lins](https://twitter.com/timolins), [Tobias Lins](https://twitter.com/linstobias), [Sam Wight](https://samw.dev), and other contributors.
