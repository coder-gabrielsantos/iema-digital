import mongoose, { Connection } from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';
const PLATFORM_MONGODB_URI = process.env.PLATFORM_MONGODB_URI || '';

type CachedConn = {
  conn: Connection | null;
  promise: Promise<Connection> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var studentsMongooseCache: CachedConn | undefined;
  // eslint-disable-next-line no-var
  var platformMongooseCache: CachedConn | undefined;
}

function createCache(key: 'studentsMongooseCache' | 'platformMongooseCache') {
  if (!global[key]) {
    global[key] = { conn: null, promise: null };
  }
  return global[key] as CachedConn;
}

async function connect(uri: string, cache: CachedConn, dbLabel: string) {
  if (!uri) {
    throw new Error(`${dbLabel} não configurado. Defina a URI no .env.local.`);
  }
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose.createConnection(uri, { bufferCommands: false }).asPromise();
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

export async function connectStudentsDB() {
  const cache = createCache('studentsMongooseCache');
  return connect(MONGODB_URI, cache, 'MONGODB_URI');
}

export async function connectPlatformDB() {
  const cache = createCache('platformMongooseCache');
  return connect(PLATFORM_MONGODB_URI, cache, 'PLATFORM_MONGODB_URI');
}
