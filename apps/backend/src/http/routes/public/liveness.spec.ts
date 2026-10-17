import { expect, test } from 'bun:test'
import { api } from '@/http/app'

test('GET /healthz returns 200 with status and uptime', async () => {
  const { data, status } = await api.healthz.get()

  expect(status).toBe(200)
  expect(data).toEqual({
    status: 'available',
    uptime: expect.any(Number),
  })
})
