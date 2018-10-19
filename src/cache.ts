import cacheManager from 'cache-manager'

// The TypeScript definition for cache-manager does not export the Cache interface so we recreate it here
export interface Cache {
  wrap<T> (key: string, wrapper: (callback: (error: any, result: T) => void) => any, options: CacheConfig): Promise<any>
}
export interface CacheConfig {
  ttl: number
}

export function createDefaultCache (): Cache {
  return cacheManager.caching({
    store: 'memory',
    ttl: 60 * 60 // 1 hour
  })
}
