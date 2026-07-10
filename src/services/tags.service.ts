import { db } from '../db'
import { tags, urlTags, urls } from '../db/schema'
import { eq, and, count, inArray, isNull } from 'drizzle-orm'
import { AppError } from '../utils/AppError'
import type { CreateTagInput, UpdateTagInput } from '../validators/tag.validators'

export async function createTag(userId: string, input: CreateTagInput) {
  const [existing] = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.userId, userId), eq(tags.name, input.name)))
    .limit(1)

  if (existing) {
    throw new AppError('A tag with this name already exists', 409, 'TAG_EXISTS')
  }

  const [result] = await db
    .insert(tags)
    .values({ name: input.name, color: input.color, userId })
    .returning()

  return result
}

export async function listTags(userId: string) {
  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      createdAt: tags.createdAt,
    })
    .from(tags)
    .where(eq(tags.userId, userId))
    .orderBy(tags.name)

  const tagsWithCounts = await Promise.all(
    rows.map(async (tag) => {
      const [urlCountResult] = await db
        .select({ total: count() })
        .from(urlTags)
        .where(eq(urlTags.tagId, tag.id))

      return {
        ...tag,
        createdAt: tag.createdAt.toISOString(),
        urlCount: urlCountResult?.total ?? 0,
      }
    }),
  )

  return tagsWithCounts
}

export async function updateTag(id: number, userId: string, input: UpdateTagInput) {
  const [existing] = await db
    .select()
    .from(tags)
    .where(and(eq(tags.id, id), eq(tags.userId, userId)))
    .limit(1)

  if (!existing) {
    throw new AppError('Tag not found', 404, 'TAG_NOT_FOUND')
  }

  if (input.name) {
    const [duplicate] = await db
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.userId, userId), eq(tags.name, input.name)))
      .limit(1)

    if (duplicate && duplicate.id !== id) {
      throw new AppError('A tag with this name already exists', 409, 'TAG_EXISTS')
    }
  }

  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.color !== undefined) updates.color = input.color

  const [result] = await db
    .update(tags)
    .set(updates)
    .where(eq(tags.id, id))
    .returning()

  return result
}

export async function deleteTag(id: number, userId: string) {
  const [existing] = await db
    .select()
    .from(tags)
    .where(and(eq(tags.id, id), eq(tags.userId, userId)))
    .limit(1)

  if (!existing) {
    throw new AppError('Tag not found', 404, 'TAG_NOT_FOUND')
  }

  await db.delete(tags).where(eq(tags.id, id))
}

export async function tagUrl(urlCode: string, tagIds: number[], userId: string) {
  const [urlRow] = await db
    .select()
    .from(urls)
    .where(and(eq(urls.code, urlCode), isNull(urls.deletedAt)))
    .limit(1)

  if (!urlRow) {
    throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
  }
  if (urlRow.userId !== userId) {
    throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
  }

  const userTags = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.userId, userId), inArray(tags.id, tagIds)))

  const validTagIds = userTags.map((t) => t.id)

  if (validTagIds.length === 0) {
    throw new AppError('No valid tags found', 404, 'TAGS_NOT_FOUND')
  }

  for (const tagId of validTagIds) {
    await db
      .insert(urlTags)
      .values({ urlCode, tagId })
      .onConflictDoNothing()
  }

  return { urlCode, tagIds: validTagIds }
}

export async function untagUrl(urlCode: string, tagIds: number[], userId: string) {
  const [urlRow] = await db
    .select()
    .from(urls)
    .where(and(eq(urls.code, urlCode), isNull(urls.deletedAt)))
    .limit(1)

  if (!urlRow) {
    throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
  }
  if (urlRow.userId !== userId) {
    throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
  }

  await db
    .delete(urlTags)
    .where(and(eq(urlTags.urlCode, urlCode), inArray(urlTags.tagId, tagIds)))
}

export async function bulkTagUrls(codes: string[], tagIds: number[], userId: string) {
  const userTags = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.userId, userId), inArray(tags.id, tagIds)))

  const validTagIds = userTags.map((t) => t.id)
  if (validTagIds.length === 0) {
    throw new AppError('No valid tags found', 404, 'TAGS_NOT_FOUND')
  }

  const results: { code: string; success: boolean; error?: string }[] = []

  for (const code of codes) {
    try {
      const [urlRow] = await db
        .select()
        .from(urls)
        .where(and(eq(urls.code, code), isNull(urls.deletedAt)))
        .limit(1)

      if (!urlRow || urlRow.userId !== userId) {
        results.push({ code, success: false, error: 'URL not found' })
        continue
      }

      for (const tagId of validTagIds) {
        await db
          .insert(urlTags)
          .values({ urlCode: code, tagId })
          .onConflictDoNothing()
      }

      results.push({ code, success: true })
    } catch {
      results.push({ code, success: false, error: 'Failed to tag URL' })
    }
  }

  return results
}

export async function getUrlsByTag(tagId: number, userId: string, page: number, limit: number) {
  const [tag] = await db
    .select()
    .from(tags)
    .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
    .limit(1)

  if (!tag) {
    throw new AppError('Tag not found', 404, 'TAG_NOT_FOUND')
  }

  const offset = (page - 1) * limit

  const [totalResult] = await db
    .select({ total: count() })
    .from(urlTags)
    .where(eq(urlTags.tagId, tagId))

  const total = totalResult?.total ?? 0

  const urlCodes = await db
    .select({ urlCode: urlTags.urlCode })
    .from(urlTags)
    .where(eq(urlTags.tagId, tagId))
    .limit(limit)
    .offset(offset)

  return {
    urlCodes: urlCodes.map((u) => u.urlCode),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}
