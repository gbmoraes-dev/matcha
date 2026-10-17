import z from 'zod'

export const error = z.object({
  code: z.string(),
  message: z.string(),
})
