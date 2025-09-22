// record-map.ts

export type StaleFetcher<TK, T> = (key: TK) => Promise<T | null> | T | null;

/**
 * A map-like cache for records that can become stale and auto-refresh via a user-defined fetcher.
 * 
 * @template TK Key type (string | number)
 * @template T  Value type
 */
export class RecordMap<TK extends string | number, T> {
    private records = new Map<TK, { value: T; lastUpdatedAt: number }>();
    public fetchIfStale?: StaleFetcher<TK, T>;

    constructor(
        private staleAfterMs: number = 5 * 60 * 1000, // Default to 5 minutes
        fetchIfStale?: StaleFetcher<TK, T>
    ) {
        if (fetchIfStale) {
            this.fetchIfStale = fetchIfStale;
        }
    }

    set(key: TK, value: T, now: number = Date.now()) {
        this.records.set(key, { value, lastUpdatedAt: now });
    }

    /** Get value. If missing or stale, tries to refresh via fetchIfStale. */
    async get(key: TK, now: number = Date.now()): Promise<T | null> {
        const rec = this.records.get(key);
        if (!rec || now - rec.lastUpdatedAt > this.staleAfterMs) {
            if (this.fetchIfStale) {
                const result = await this.fetchIfStale(key);
                if (result != null && result !== undefined) {
                    this.set(key, result, now);
                    return result;
                }
                return null;
            }
            return null;
        }
        return rec.value;
    }

    /** Get the raw record even if stale. */
    getRaw(key: TK): { value: T; lastUpdatedAt: number } | undefined {
        return this.records.get(key);
    }

    has(key: TK): boolean {
        return this.records.has(key);
    }


    /** Check if the record is missing or stale. */
    isStale(key: TK, now: number = Date.now()): boolean {
        const rec = this.records.get(key);
        if (!rec) return true;
        return now - rec.lastUpdatedAt > this.staleAfterMs;
    }

    delete(key: TK) {
        this.records.delete(key);
    }

    clear() {
        this.records.clear();
    }

    keys(): TK[] {
        return Array.from(this.records.keys());
    }

    values(): T[] {
        return Array.from(this.records.values()).map(r => r.value);
    }

    forEach(fn: (key: TK, value: T, lastUpdatedAt: number) => void): void {
        for (const [k, v] of this.records.entries()) {
            fn(k, v.value, v.lastUpdatedAt);
        }
    }
}
