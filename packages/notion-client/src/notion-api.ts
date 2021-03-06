import got from 'got'
import pMap from 'p-map'

import { parsePageId } from 'notion-utils'
import * as notion from 'notion-types'

import * as types from './types'

export class NotionAPI {
  private readonly _apiBaseUrl: string
  private readonly _authToken?: string
  private readonly _userLocale: string
  private readonly _userTimeZone: string

  constructor({
    apiBaseUrl = 'https://www.notion.so/api/v3',
    authToken,
    userLocale = 'en',
    userTimeZone = 'America/New_York'
  }: {
    apiBaseUrl?: string
    authToken?: string
    userLocale?: string
    userTimeZone?: string
  } = {}) {
    this._apiBaseUrl = apiBaseUrl
    this._authToken = authToken
    this._userLocale = userLocale
    this._userTimeZone = userTimeZone
  }

  public async getPage(
    pageId: string,
    {
      fetchCollections = true
    }: { concurrency?: number; fetchCollections?: boolean } = {}
  ): Promise<notion.ExtendedRecordMap> {
    const page = await this.getPageRaw(pageId)
    const recordMap = page.recordMap as notion.ExtendedRecordMap

    if (!recordMap.block) {
      throw new Error(`Notion page not found "${pageId}"`)
    }

    // ensure that all top-level maps exist
    recordMap.collection = recordMap.collection ?? {}
    recordMap.collection_view = recordMap.collection_view ?? {}
    recordMap.notion_user = recordMap.notion_user ?? {}
    recordMap.collection_query = {}

    // fetch any missing content blocks
    while (true) {
      const pendingBlocks = Object.keys(recordMap.block).flatMap((blockId) => {
        const block = recordMap.block[blockId]
        const content = block.value && block.value.content

        return content && block.value.type !== 'page'
          ? content.filter((id) => !recordMap.block[id])
          : []
      })

      if (!pendingBlocks.length) {
        break
      }

      const newBlocks = await this.getBlocks(pendingBlocks).then(
        (res) => res.recordMap.block
      )

      recordMap.block = { ...recordMap.block, ...newBlocks }
    }

    if (fetchCollections) {
      const allCollectionInstances = Object.keys(recordMap.block).flatMap(
        (blockId) => {
          const block = recordMap.block[blockId]

          if (block.value.type === 'collection_view') {
            const value = block.value

            return value.view_ids.map((collectionViewId) => ({
              collectionId: value.collection_id,
              collectionViewId
            }))
          } else {
            return []
          }
        }
      )

      // fetch data for all collection view instances
      await pMap(
        allCollectionInstances,
        async (collectionInstance) => {
          const { collectionId, collectionViewId } = collectionInstance
          const collectionView =
            recordMap.collection_view[collectionViewId]?.value

          const collectionData = await this.getCollectionData(
            collectionId,
            collectionViewId,
            {
              type: collectionView?.type,
              query: collectionView?.query2,
              groups: collectionView?.format?.board_groups2
            }
          )

          recordMap.block = {
            ...recordMap.block,
            ...collectionData.recordMap.block
          }

          recordMap.collection = {
            ...recordMap.collection,
            ...collectionData.recordMap.collection
          }

          recordMap.collection_view = {
            ...recordMap.collection_view,
            ...collectionData.recordMap.collection_view
          }

          recordMap.notion_user = {
            ...recordMap.notion_user,
            ...collectionData.recordMap.notion_user
          }

          recordMap.collection_query![collectionId] = {
            ...recordMap.collection_query![collectionId],
            [collectionViewId]: collectionData.result
          }
        },
        {
          concurrency: 1
        }
      )
    }

    return recordMap
  }

  public async getPageRaw(pageId: string) {
    const parsedPageId = parsePageId(pageId)

    if (!parsedPageId) {
      throw new Error(`invalid notion pageId "${pageId}"`)
    }

    return this.fetch<notion.PageChunk>({
      endpoint: 'loadPageChunk',
      body: {
        pageId: parsedPageId,
        limit: 999999,
        cursor: { stack: [] },
        chunkNumber: 0,
        verticalColumns: false
      }
    })
  }

  public async getCollectionData(
    collectionId: string,
    collectionViewId: string,
    {
      type = 'table',
      query = { aggregations: [{ property: 'title', aggregator: 'count' }] },
      groups = undefined,
      limit = 999999,
      searchQuery = '',
      userTimeZone = this._userTimeZone,
      userLocale = this._userLocale,
      loadContentCover = true
    }: {
      type?: notion.CollectionViewType
      query?: any
      groups?: any
      limit?: number
      searchQuery?: string
      userTimeZone?: string
      userLocale?: string
      loadContentCover?: boolean
    } = {}
  ) {
    // TODO: All other collection types queries fail with 400 errors.
    // My guess is that they require slightly different query params, but since
    // their results are the same AFAICT, there's not much point in supporting
    // them.
    if (type !== 'table' && type !== 'board') {
      type = 'table'
    }

    const loader: any = {
      type,
      limit,
      searchQuery,
      userTimeZone,
      userLocale,
      loadContentCover
    }

    if (groups) {
      // used for 'board' collection view queries
      loader.groups = groups
    }

    if (type === 'board') {
      console.log(JSON.stringify({ query, loader }, null, 2))
    }

    return this.fetch<notion.CollectionInstance>({
      endpoint: 'queryCollection',
      body: {
        collectionId,
        collectionViewId,
        query,
        loader
      }
    })
  }

  public async getUsers(userIds: string[]) {
    return this.fetch<notion.RecordValues<notion.User>>({
      endpoint: 'getRecordValues',
      body: {
        requests: userIds.map((id) => ({ id, table: 'notion_user' }))
      }
    })
  }

  public async getBlocks(blockIds: string[]) {
    return this.fetch<notion.PageChunk>({
      endpoint: 'syncRecordValues',
      body: {
        recordVersionMap: {
          block: blockIds.reduce(
            (acc, blockId) => ({
              ...acc,
              [blockId]: -1
            }),
            {}
          )
        }
      }
    })
  }

  public async getSignedFileUrls(urls: types.SignedUrlRequest[]) {
    return this.fetch<types.SignedUrlResponse>({
      endpoint: 'getSignedFileUrls',
      body: {
        urls
      }
    })
  }

  public async search(params: notion.SearchParams) {
    return this.fetch<notion.SearchResults>({
      endpoint: 'search',
      body: {
        type: 'BlocksInAncestor',
        source: 'quick_find_public',
        ancestorId: params.ancestorId,
        filters: {
          isDeletedOnly: false,
          excludeTemplates: true,
          isNavigableOnly: true,
          requireEditPermissions: false,
          ancestors: [],
          createdBy: [],
          editedBy: [],
          lastEditedTime: {},
          createdTime: {},
          ...params.filters
        },
        sort: 'Relevance',
        limit: params.limit || 20,
        query: params.query
      }
    })
  }

  public async fetch<T>({
    endpoint,
    body
  }: {
    endpoint: string
    body: object
  }): Promise<T> {
    const headers: any = {}

    if (this._authToken) {
      headers.cookie = `token_v2=${this._authToken}`
    }

    return got
      .post(endpoint, {
        prefixUrl: this._apiBaseUrl,
        json: body,
        headers
      })
      .json()
  }
}
