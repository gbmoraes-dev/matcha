import { z } from 'zod'

const commands = {
  api: () => import('./http/server'),
  worker: () => import('./worker/subscriber'),
  migrate: () => import('./database/migrate'),
}

const command = z.enum(['api', 'worker', 'migrate']).parse(Bun.argv[2])

await commands[command]()
