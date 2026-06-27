import AsyncStorage from '@react-native-async-storage/async-storage';
import { type SendRequestFormData } from '@/types';

const STORAGE_KEY = 'nudgli_pending_requests';
const MAX_ENTRIES = 50;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

export interface CachedRequest {
  id: string;
  data: SendRequestFormData;
  createdAt: number; // Unix timestamp in ms
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function isExpired(createdAt: number, now: number): boolean {
  return now - createdAt > MAX_AGE_MS;
}

async function loadEntries(): Promise<CachedRequest[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CachedRequest[];
  } catch {
    return [];
  }
}

async function saveEntries(entries: CachedRequest[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/**
 * Saves a pending review request to the local cache.
 * Evicts entries older than 30 days, then adds the new entry.
 * If at capacity (50), drops the oldest entry to make room.
 */
export async function savePendingRequest(data: SendRequestFormData): Promise<void> {
  const now = Date.now();
  let entries = await loadEntries();

  // Evict entries older than 30 days
  entries = entries.filter((entry) => !isExpired(entry.createdAt, now));

  // If at capacity, drop the oldest entry to make room
  if (entries.length >= MAX_ENTRIES) {
    entries.sort((a, b) => a.createdAt - b.createdAt);
    entries = entries.slice(entries.length - MAX_ENTRIES + 1);
  }

  const newEntry: CachedRequest = {
    id: generateId(),
    data,
    createdAt: now,
  };

  entries.push(newEntry);
  await saveEntries(entries);
}

/**
 * Returns all cached pending requests.
 */
export async function getPendingRequests(): Promise<CachedRequest[]> {
  return loadEntries();
}

/**
 * Removes a single pending request by its id.
 */
export async function removePendingRequest(id: string): Promise<void> {
  const entries = await loadEntries();
  const filtered = entries.filter((entry) => entry.id !== id);
  await saveEntries(filtered);
}

/**
 * Clears all pending requests from the cache.
 */
export async function clearAllPendingRequests(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
