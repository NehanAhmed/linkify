import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as domainService from '../services/domain.service'

const addDomainSchema = z.object({
  domain: z.string().min(1).max(255),
})

const domainParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export async function addDomain(req: Request, res: Response, next: NextFunction) {
  try {
    const { domain } = addDomainSchema.parse(req.body)
    const result = await domainService.addDomain(req.user!.id, domain)
    res.status(201).json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function listDomains(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await domainService.listDomains(req.user!.id)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function verifyDomain(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = domainParamsSchema.parse(req.params)
    const result = await domainService.verifyDomain(req.user!.id, id)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function removeDomain(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = domainParamsSchema.parse(req.params)
    await domainService.removeDomain(req.user!.id, id)
    res.json({ success: true, message: 'Domain removed successfully' })
  } catch (err) {
    next(err)
  }
}
