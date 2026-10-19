import passwords from './passwords.txt' with { type: 'text' }

const commonPasswords = new Set(passwords.split('\n'))

export function isCommonPassword(password: string) {
  return commonPasswords.has(password.toLowerCase())
}
