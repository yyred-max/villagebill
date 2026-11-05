// src/utils/format.ts
export function truncateHash(hash: string, start: number = 10, end: number = 6): string {
    if (!hash || hash.length <= start + end) return hash;
    return `${hash.slice(0, start)}...${hash.slice(-end)}`;
  }