import { BookGuide } from '../types';
import { getCurrentUsername } from './api';

function CACHE_KEY(): string {
  const u = getCurrentUsername();
  return u ? `rg-cache-${u}` : 'rg-cache';
}

interface CacheEntry { guide: BookGuide; timestamp: number; }

function loadCache(): Map<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY());
    if (!raw) return new Map();
    const parsed = JSON.parse(raw);
    return new Map(Object.entries(parsed));
  } catch { return new Map(); }
}

function saveCache(cache: Map<string, CacheEntry>) {
  try {
    localStorage.setItem(CACHE_KEY(), JSON.stringify(Object.fromEntries(cache)));
  } catch {
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
    localStorage.setItem(CACHE_KEY(), JSON.stringify(Object.fromEntries(entries.slice(0, 30))));
  }
}

function makeKey(bookName: string, author?: string, withStickyNotes?: boolean): string {
  const base = author ? `${bookName.trim()}||${author.trim()}` : bookName.trim();
  return withStickyNotes ? `${base}||sticky` : base;
}

export function getCached(bookName: string, author?: string, withStickyNotes?: boolean): BookGuide | null {
  const cache = loadCache();
  const entry = cache.get(makeKey(bookName, author, withStickyNotes));
  if (entry) { entry.timestamp = Date.now(); saveCache(cache); return entry.guide; }
  return null;
}

export function setCache(bookName: string, author: string | undefined, guide: BookGuide, withStickyNotes?: boolean) {
  const cache = loadCache();
  cache.set(makeKey(bookName, author, withStickyNotes), { guide, timestamp: Date.now() });
  saveCache(cache);
}

export function getHistory(): { key: string; bookName: string; author: string; withStickyNotes: boolean; generatedAt: string }[] {
  const cache = loadCache();
  return Array.from(cache.entries())
    .map(([k, v]) => {
      let parts = k.split('||');
      const withStickyNotes = parts[parts.length - 1] === 'sticky';
      if (withStickyNotes) parts = parts.slice(0, -1);
      return { key: k, bookName: parts[0] || '', author: parts[1] || '', withStickyNotes, generatedAt: v.guide.generatedAt };
    })
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
}

export function getCachedByKey(rawKey: string): BookGuide | null {
  const entry = loadCache().get(rawKey);
  return entry ? entry.guide : null;
}

export function clearHistory() { localStorage.removeItem(CACHE_KEY()); }

export function deleteCacheEntry(key: string) {
  const cache = loadCache();
  cache.delete(key);
  saveCache(cache);
}
