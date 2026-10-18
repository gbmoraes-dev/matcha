export function withTimeout<T>(promise: Promise<T>, ms: number, label: string) {
  const timeout = Bun.sleep(ms).then(() => {
    throw new Error(`${label} timed out after ${ms}ms`)
  })

  return Promise.race([promise, timeout])
}
