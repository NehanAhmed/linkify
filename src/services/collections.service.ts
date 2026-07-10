import { db } from '../db'
import { collections, urlCollections, urls } from '../db/schema'
import { eq, and, count, inArray } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { AppError } from '../utils/AppError'
import type { CreateCollectionInput, UpdateCollectionInput, ReorderCollectionsInput } from '../validators/collection.validators'

export async function createCollection(userId: string, input: CreateCollectionInput) {
  if (input.parentId) {
    const [parent] = await db
      .select({ userId: collections.userId })
      .from(collections)
      .where(eq(collections.id, input.parentId))
      .limit(1)

    if (!parent || parent.userId !== userId) {
      throw new AppError('Parent collection not found', 404, 'COLLECTION_NOT_FOUND')
    }
  }

  const [result] = await db
    .insert(collections)
    .values({
      name: input.name,
      parentId: input.parentId ?? null,
      userId,
    })
    .returning()

  return result
}

export async function listCollections(userId: string) {
  const rows = await db
    .select({
      id: collections.id,
      name: collections.name,
      parentId: collections.parentId,
      sortOrder: collections.sortOrder,
      createdAt: collections.createdAt,
    })
    .from(collections)
    .where(eq(collections.userId, userId))
    .orderBy(collections.sortOrder, collections.createdAt)

  const collectionsWithCounts = await Promise.all(
    rows.map(async (col) => {
      const [urlCountResult] = await db
        .select({ total: count() })
        .from(urlCollections)
        .where(eq(urlCollections.collectionId, col.id))

      return {
        ...col,
        createdAt: col.createdAt.toISOString(),
        urlCount: urlCountResult?.total ?? 0,
      }
    }),
  )

  return collectionsWithCounts
}

export async function getCollection(id: number, userId: string) {
  const [col] = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, id), eq(collections.userId, userId)))
    .limit(1)

  if (!col) {
    throw new AppError('Collection not found', 404, 'COLLECTION_NOT_FOUND')
  }
  return col
}

export async function updateCollection(id: number, userId: string, input: UpdateCollectionInput) {
  const [existing] = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, id), eq(collections.userId, userId)))
    .limit(1)

  if (!existing) {
    throw new AppError('Collection not found', 404, 'COLLECTION_NOT_FOUND')
  }

  if (input.parentId) {
    const [parent] = await db
      .select({ userId: collections.userId })
      .from(collections)
      .where(eq(collections.id, input.parentId))
      .limit(1)

    if (!parent || parent.userId !== userId) {
      throw new AppError('Parent collection not found', 404, 'COLLECTION_NOT_FOUND')
    }

    if (input.parentId === id) {
      throw new AppError('A collection cannot be its own parent', 400, 'INVALID_PARENT')
    }
  }

  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.parentId !== undefined) updates.parentId = input.parentId
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder

  const [result] = await db
    .update(collections)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(collections.id, id))
    .returning()

  return result
}

export async function deleteCollection(id: number, userId: string) {
  const [existing] = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, id), eq(collections.userId, userId)))
    .limit(1)

  if (!existing) {
    throw new AppError('Collection not found', 404, 'COLLECTION_NOT_FOUND')
  }

  await db.delete(collections).where(eq(collections.id, id))
}

export async function addUrlToCollection(urlCode: string, collectionId: number, userId: string) {
  const [col] = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
    .limit(1)

  if (!col) {
    throw new AppError('Collection not found', 404, 'COLLECTION_NOT_FOUND')
  }

  await db
    .insert(urlCollections)
    .values({ urlCode, collectionId })
    .onConflictDoNothing()

  return { urlCode, collectionId }
}

export async function removeUrlFromCollection(urlCode: string, collectionId: number, userId: string) {
  const [col] = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
    .limit(1)

  if (!col) {
    throw new AppError('Collection not found', 404, 'COLLECTION_NOT_FOUND')
  }

  await db
    .delete(urlCollections)
    .where(
      and(
        eq(urlCollections.urlCode, urlCode),
        eq(urlCollections.collectionId, collectionId),
      ),
    )
}

export async function getCollectionUrls(collectionId: number, userId: string, page: number, limit: number) {
  const [col] = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
    .limit(1)

  if (!col) {
    throw new AppError('Collection not found', 404, 'COLLECTION_NOT_FOUND')
  }

  const offset = (page - 1) * limit

  const [totalResult] = await db
    .select({ total: count() })
    .from(urlCollections)
    .where(eq(urlCollections.collectionId, collectionId))

  const total = totalResult?.total ?? 0

  const urlCodes = await db
    .select({ urlCode: urlCollections.urlCode })
    .from(urlCollections)
    .where(eq(urlCollections.collectionId, collectionId))
    .limit(limit)
    .offset(offset)

  return {
    urlCodes: urlCodes.map((u) => u.urlCode),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export async function reorderCollections(userId: string, items: ReorderCollectionsInput) {
  const userCollections = await db
    .select({ id: collections.id })
    .from(collections)
    .where(eq(collections.userId, userId))

  const validIds = new Set(userCollections.map((c) => c.id))

  for (const item of items) {
    if (!validIds.has(item.id)) {
      throw new AppError(`Collection ${item.id} not found`, 404, 'COLLECTION_NOT_FOUND')
    }
  }

  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx
        .update(collections)
        .set({ sortOrder: item.sortOrder, updatedAt: new Date() })
        .where(eq(collections.id, item.id))
    }
  })
}

export async function shareCollection(id: number, userId: string) {
  const [existing] = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, id), eq(collections.userId, userId)))
    .limit(1)

  if (!existing) {
    throw new AppError('Collection not found', 404, 'COLLECTION_NOT_FOUND')
  }

  const shareToken = existing.shareToken ?? randomUUID()

  if (!existing.shareToken) {
    await db
      .update(collections)
      .set({ shareToken, sharedAt: new Date() })
      .where(eq(collections.id, id))
  }

  return { shareToken }
}

export async function revokeShare(id: number, userId: string) {
  const [existing] = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, id), eq(collections.userId, userId)))
    .limit(1)

  if (!existing) {
    throw new AppError('Collection not found', 404, 'COLLECTION_NOT_FOUND')
  }

  await db
    .update(collections)
    .set({ shareToken: null, sharedAt: null })
    .where(eq(collections.id, id))
}

export async function getSharedCollection(token: string) {
  const [col] = await db
    .select()
    .from(collections)
    .where(eq(collections.shareToken, token))
    .limit(1)

  if (!col) {
    throw new AppError('Shared collection not found', 404, 'SHARED_COLLECTION_NOT_FOUND')
  }

  const urlCodeRows = await db
    .select({ urlCode: urlCollections.urlCode })
    .from(urlCollections)
    .where(eq(urlCollections.collectionId, col.id))

  const codes = urlCodeRows.map((r) => r.urlCode)

  const urlRows = codes.length > 0
    ? await db
        .select({
          code: urls.code,
          url: urls.url,
          title: urls.title,
          description: urls.description,
          image: urls.image,
          visits: urls.visits,
        })
        .from(urls)
        .where(and(inArray(urls.code, codes)))
    : []

  return {
    collection: { id: col.id, name: col.name, urlCount: urlRows.length },
    urls: urlRows,
  }
}
