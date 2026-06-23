import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'review_rocket_event_buffer';
const MAX_BUFFER_SIZE = 100;

export interface BufferedEvent {
  type: 'sentry' | 'posthog';
  payload: unknown;
  timestamp: number;
}

/**
 * Adds an event to the buffer.
 * If the buffer exceeds MAX_BUFFER_SIZE (100), the oldest events are dropped.
 */
export async function bufferEvent(event: BufferedEvent): Promise<void> {
  let events = await getBufferedEvents();

  events.push(event);

  // Drop oldest events if capacity exceeded
  if (events.length > MAX_BUFFER_SIZE) {
    events = events.slice(events.length - MAX_BUFFER_SIZE);
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

/**
 * Returns all buffered events.
 */
export async function getBufferedEvents(): Promise<BufferedEvent[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as BufferedEvent[];
  } catch {
    return [];
  }
}

/**
 * Removes all events from the buffer.
 */
export async function clearBuffer(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/**
 * Attempts to send all buffered events using the provided sender function.
 * If the sender returns true (success), the buffer is cleared.
 * If the sender returns false (failure), the buffer remains intact for later retry.
 */
export async function flushBuffer(
  sender: (events: BufferedEvent[]) => Promise<boolean>
): Promise<boolean> {
  const events = await getBufferedEvents();
  if (events.length === 0) return true;

  const success = await sender(events);
  if (success) {
    await clearBuffer();
  }

  return success;
}
