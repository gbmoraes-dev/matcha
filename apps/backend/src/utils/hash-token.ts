export function hashToken(token: string) {
  return new Bun.CryptoHasher('sha256').update(token).digest('hex')
}
