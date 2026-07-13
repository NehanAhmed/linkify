import { randomBytes } from 'crypto'
import { db } from '../db'
import { customDomains, urls, plans } from '../db/schema'
import { eq, and, isNull, sql } from 'drizzle-orm'
import { AppError } from '../utils/AppError'
import { getUserPlan } from './subscription.service'

const DNS_VERIFICATION_PREFIX = '_linkify-domain-verification'

function generateVerificationToken(): string {
  return randomBytes(16).toString('hex')
}

export async function addDomain(userId: string, domain: string) {
  const normalized = domain.toLowerCase().trim()

  const plan = await getUserPlan(userId)
  const [existingCount] = await db
    .select({ total: sql<number>`count(*)` })
    .from(customDomains)
    .where(and(eq(customDomains.userId, userId), eq(customDomains.active, true)))

  if ((existingCount?.total ?? 0) >= plan.maxCustomDomains) {
    throw new AppError(
      `Custom domain limit reached (${plan.maxCustomDomains}/${plan.maxCustomDomains}). Upgrade your plan for more.`,
      403,
      'PLAN_LIMIT_REACHED',
    )
  }

  const [taken] = await db
    .select({ id: customDomains.id })
    .from(customDomains)
    .where(eq(customDomains.domain, normalized))
    .limit(1)

  if (taken) {
    throw new AppError('Domain already registered', 409, 'DOMAIN_TAKEN')
  }

  const verificationToken = generateVerificationToken()

  const [inserted] = await db
    .insert(customDomains)
    .values({
      userId,
      domain: normalized,
      verificationToken,
    })
    .returning({
      id: customDomains.id,
      domain: customDomains.domain,
      verificationToken: customDomains.verificationToken,
      verifiedAt: customDomains.verifiedAt,
      sslStatus: customDomains.sslStatus,
      active: customDomains.active,
      createdAt: customDomains.createdAt,
    })

  return {
    ...inserted,
    dnsRecord: `${DNS_VERIFICATION_PREFIX} TXT "${verificationToken}"`,
  }
}

export async function verifyDomain(userId: string, domainId: number) {
  const [domain] = await db
    .select()
    .from(customDomains)
    .where(and(eq(customDomains.id, domainId), eq(customDomains.userId, userId)))
    .limit(1)

  if (!domain) {
    throw new AppError('Domain not found', 404, 'DOMAIN_NOT_FOUND')
  }

  if (domain.verifiedAt) {
    throw new AppError('Domain already verified', 400, 'DOMAIN_ALREADY_VERIFIED')
  }

  await db
    .update(customDomains)
    .set({
      verifiedAt: new Date(),
      active: true,
      sslStatus: 'pending',
      updatedAt: new Date(),
    })
    .where(eq(customDomains.id, domainId))

  return { message: 'Domain verified successfully', sslStatus: 'pending' }
}

export async function listDomains(userId: string) {
  const rows = await db
    .select()
    .from(customDomains)
    .where(eq(customDomains.userId, userId))
    .orderBy(customDomains.createdAt)

  return rows.map((d) => ({
    id: d.id,
    domain: d.domain,
    verifiedAt: d.verifiedAt?.toISOString() ?? null,
    sslStatus: d.sslStatus,
    active: d.active,
    createdAt: d.createdAt.toISOString(),
  }))
}

export async function removeDomain(userId: string, domainId: number) {
  const [domain] = await db
    .select({ id: customDomains.id, userId: customDomains.userId })
    .from(customDomains)
    .where(eq(customDomains.id, domainId))
    .limit(1)

  if (!domain) {
    throw new AppError('Domain not found', 404, 'DOMAIN_NOT_FOUND')
  }
  if (domain.userId !== userId) {
    throw new AppError('Domain not found', 404, 'DOMAIN_NOT_FOUND')
  }

  await db.delete(customDomains).where(eq(customDomains.id, domainId))
}

export async function updateDomainSslStatus(domainId: number, status: string) {
  await db
    .update(customDomains)
    .set({
      sslStatus: status,
      sslExpiresAt: status === 'active' ? new Date(Date.now() + 90 * 86_400_000) : null,
      updatedAt: new Date(),
    })
    .where(eq(customDomains.id, domainId))
}
