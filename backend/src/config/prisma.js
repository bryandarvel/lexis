import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'

import { env } from './env.js'

const connectionUrl =
  env.NODE_ENV === 'test'
    ? env.TEST_DATABASE_URL
    : env.DATABASE_URL

const databaseUrl = new URL(connectionUrl)

const adapter = new PrismaMariaDb({
  host: databaseUrl.hostname,
  port: Number(databaseUrl.port || 3306),
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(
    databaseUrl.password,
  ),
  database: decodeURIComponent(
    databaseUrl.pathname.slice(1),
  ),
  allowPublicKeyRetrieval:
    env.NODE_ENV !== 'production',
  connectionLimit: 5,
  connectTimeout: 5000,
  acquireTimeout: 5000,
})

export const prisma = new PrismaClient({
  adapter,
  log:
    env.NODE_ENV === 'development'
      ? ['warn', 'error']
      : ['error'],
})