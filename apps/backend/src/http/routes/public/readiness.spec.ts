import { afterEach, expect, mock, spyOn, test } from 'bun:test'
import { db } from '@/database'
import { api } from '@/http/app'

afterEach(() => {
  mock.restore()
})

async function refuseConnection(): Promise<never> {
  throw new Error('connection refused')
}

test('GET /readyz returns 200 when the database answers', async () => {
  const { data, status } = await api.readyz.get()

  expect(status).toBe(200)
  expect(data).toEqual({ application: 'available', database: 'available' })
})

test('GET /readyz returns 503 when the database is unavailable', async () => {
  spyOn(db.$client, 'query').mockImplementationOnce(refuseConnection)

  const { error, status } = await api.readyz.get()

  expect(status).toBe(503)
  expect(error?.value).toEqual({
    application: 'available',
    database: 'unavailable',
  })
})

test('GET /healthz stays 200 while the database is unavailable', async () => {
  spyOn(db.$client, 'query').mockImplementationOnce(refuseConnection)

  const readyz = await api.readyz.get()
  const healthz = await api.healthz.get()

  expect(readyz.status).toBe(503)
  expect(healthz.status).toBe(200)
})

test('GET /readyz recovers once the database answers again', async () => {
  spyOn(db.$client, 'query').mockImplementationOnce(refuseConnection)
  const down = await api.readyz.get()

  mock.restore()
  const up = await api.readyz.get()

  expect(down.status).toBe(503)
  expect(up.status).toBe(200)
})
