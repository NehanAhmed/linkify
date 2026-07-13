import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { getSharedCollection } from '../services/collections.service'

const sharedTokenSchema = z.object({
  token: z.string().uuid(),
})

export async function getShared(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = sharedTokenSchema.parse(req.params)
    const result = await getSharedCollection(token)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}
