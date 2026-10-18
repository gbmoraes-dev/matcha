import { afterEach, expect, mock, spyOn, test } from 'bun:test'
import { broker } from '@/broker/broker'
import { redis } from '@/cache'
import { db } from '@/database'
import { api } from '@/http/app'
import { s3 } from '@/storage'

afterEach(() => {
  mock.restore()
})

async function refuse(): Promise<never> {
  throw new Error('connection refused')
}

const dependencies = {
  database: () => spyOn(db.$client, 'query').mockImplementationOnce(refuse),
  cache: () => spyOn(redis, 'ping').mockImplementationOnce(refuse),
  bucket: () => spyOn(s3, 'list').mockImplementationOnce(refuse),
  broker: () => spyOn(broker, 'onConnect').mockImplementationOnce(refuse),
}

const available = {
  application: 'available',
  database: 'available',
  cache: 'available',
  bucket: 'available',
  broker: 'available',
} as const

test('GET /readyz returns 200 when every dependency answers', async () => {
  const { data, status } = await api.readyz.get()

  expect(status).toBe(200)
  expect(data).toEqual(available)
})

for (const [name, breakDependency] of Object.entries(dependencies)) {
  test(`GET /readyz returns 503 when the ${name} is unavailable`, async () => {
    breakDependency()

    const { error, status } = await api.readyz.get()

    expect(status).toBe(503)
    expect(error?.value).toEqual({ ...available, [name]: 'unavailable' })
  })

  test(`GET /healthz stays 200 while the ${name} is unavailable`, async () => {
    breakDependency()

    const readyz = await api.readyz.get()
    const healthz = await api.healthz.get()

    expect(readyz.status).toBe(503)
    expect(healthz.status).toBe(200)
  })
}

test('GET /readyz recovers once the dependencies answer again', async () => {
  dependencies.cache()
  const down = await api.readyz.get()

  mock.restore()
  const up = await api.readyz.get()

  expect(down.status).toBe(503)
  expect(up.status).toBe(200)
})
