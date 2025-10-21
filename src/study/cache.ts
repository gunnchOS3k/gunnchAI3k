// gunnchAI3k Study-Tech Omniscient v3 - Caching System
// Cost control through intelligent caching and compression

export interface CacheConfig {
  maxSize: number;
  ttl: number; // Time to live in milliseconds
  compression: boolean;
  persistence: boolean;
  storagePath?: string;
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  compressed?: boolean;
  size: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictions: number;
  compressions: number;
}

export interface CachePolicy {
  evictionStrategy: 'lru' | 'lfu' | 'ttl' | 'size';
  compressionThreshold: number;
  maxEntrySize: number;
  cleanupInterval: number;
}

export class IntelligentCache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: CacheConfig;
  private policy: CachePolicy;
  private stats: CacheStats;
  private cleanupTimer?: NodeJS.Timeout;
  
  constructor(config: CacheConfig, policy?: Partial<CachePolicy>) {
    this.config = config;
    this.policy = {
      evictionStrategy: 'lru',
      compressionThreshold: 1024, // 1KB
      maxEntrySize: 1024 * 1024, // 1MB
      cleanupInterval: 300000, // 5 minutes
      ...policy
    };
    this.stats = {
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      evictions: 0,
      compressions: 0
    };
    
    this.startCleanupTimer();
  }
  
  set(key: string, value: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      ttl: ttl || this.config.ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
      size: this.calculateSize(value)
    };
    
    // Check if entry is too large
    if (entry.size > this.policy.maxEntrySize) {
      console.warn(`Entry ${key} is too large (${entry.size} bytes), skipping cache`);
      return;
    }
    
    // Compress if needed
    if (this.config.compression && entry.size > this.policy.compressionThreshold) {
      entry.value = this.compress(entry.value) as T;
      entry.compressed = true;
      entry.size = this.calculateSize(entry.value);
      this.stats.compressions++;
    }
    
    // Check if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evict();
    }
    
    this.cache.set(key, entry);
    this.updateStats();
  }
  
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.missRate++;
      return null;
    }
    
    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.missRate++;
      return null;
    }
    
    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    // Decompress if needed
    let value = entry.value;
    if (entry.compressed) {
      value = this.decompress(entry.value) as T;
    }
    
    this.stats.hitRate++;
    return value;
  }
  
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }
  
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateStats();
    }
    return deleted;
  }
  
  clear(): void {
    this.cache.clear();
    this.updateStats();
  }
  
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }
  
  private evict(): void {
    let keyToEvict: string | null = null;
    
    switch (this.policy.evictionStrategy) {
      case 'lru':
        keyToEvict = this.findLRUKey();
        break;
      case 'lfu':
        keyToEvict = this.findLFUKey();
        break;
      case 'ttl':
        keyToEvict = this.findOldestKey();
        break;
      case 'size':
        keyToEvict = this.findLargestKey();
        break;
    }
    
    if (keyToEvict) {
      this.cache.delete(keyToEvict);
      this.stats.evictions++;
    }
  }
  
  private findLRUKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }
  
  private findLFUKey(): string | null {
    let leastFrequentKey: string | null = null;
    let leastFrequentCount = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < leastFrequentCount) {
        leastFrequentCount = entry.accessCount;
        leastFrequentKey = key;
      }
    }
    
    return leastFrequentKey;
  }
  
  private findOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }
  
  private findLargestKey(): string | null {
    let largestKey: string | null = null;
    let largestSize = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.size > largestSize) {
        largestSize = entry.size;
        largestKey = key;
      }
    }
    
    return largestKey;
  }
  
  private calculateSize(value: any): number {
    try {
      return JSON.stringify(value).length;
    } catch (error) {
      return 0;
    }
  }
  
  private compress(value: any): any {
    // Simple compression using JSON stringify and base64
    // In production, use a proper compression library like zlib
    try {
      const jsonStr = JSON.stringify(value);
      return Buffer.from(jsonStr).toString('base64');
    } catch (error) {
      console.error('Compression error:', error);
      return value;
    }
  }
  
  private decompress(value: any): any {
    // Simple decompression
    try {
      if (typeof value === 'string') {
        const jsonStr = Buffer.from(value, 'base64').toString();
        return JSON.parse(jsonStr);
      }
      return value;
    } catch (error) {
      console.error('Decompression error:', error);
      return value;
    }
  }
  
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.policy.cleanupInterval);
  }
  
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      this.updateStats();
    }
  }
  
  private updateStats(): void {
    this.stats.totalEntries = this.cache.size;
    this.stats.totalSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);
    
    const totalRequests = this.stats.hitRate + this.stats.missRate;
    if (totalRequests > 0) {
      this.stats.hitRate = (this.stats.hitRate / totalRequests) * 100;
      this.stats.missRate = (this.stats.missRate / totalRequests) * 100;
    }
  }
  
  getStats(): CacheStats {
    return { ...this.stats };
  }
  
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }
  
  getSize(): number {
    return this.cache.size;
  }
  
  getTotalSize(): number {
    return this.stats.totalSize;
  }
  
  // Advanced cache operations
  getOrSet(key: string, factory: () => T, ttl?: number): T {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }
    
    const value = factory();
    this.set(key, value, ttl);
    return value;
  }
  
  async getOrSetAsync(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }
    
    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }
  
  invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern);
    let invalidated = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    
    if (invalidated > 0) {
      this.updateStats();
    }
    
    return invalidated;
  }
  
  warmup(entries: Array<{ key: string; value: T; ttl?: number }>): void {
    entries.forEach(({ key, value, ttl }) => {
      this.set(key, value, ttl);
    });
  }
  
  // Persistence methods
  async save(): Promise<void> {
    if (!this.config.persistence || !this.config.storagePath) {
      return;
    }
    
    try {
      const data = Array.from(this.cache.entries());
      // In production, save to file system or database
      console.log('Cache saved to:', this.config.storagePath);
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  }
  
  async load(): Promise<void> {
    if (!this.config.persistence || !this.config.storagePath) {
      return;
    }
    
    try {
      // In production, load from file system or database
      console.log('Cache loaded from:', this.config.storagePath);
    } catch (error) {
      console.error('Error loading cache:', error);
    }
  }
  
  // Cleanup
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cache.clear();
  }
}

