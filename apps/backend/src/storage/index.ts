import { S3Client } from 'bun'
import { env } from '@/env'

export const s3 = new S3Client({
  endpoint: env.BUCKET_URL,
  bucket: env.BUCKET_NAME,
  accessKeyId: env.BUCKET_ACCESS_KEY,
  secretAccessKey: env.BUCKET_SECRET_KEY,
})
