import {
  getLocalReviews,
  getUnsyncedReviews,
  markReviewSynced,
  mergeReviewsLocally,
  saveReviewLocally,
} from '../database/db';
import type { NewReviewInput, ReviewRecord, StarRating } from '../types/review';

const RELAY_TOPIC = 'gs-exb-hype0999-2026-8f3c';
const RELAY_POST_URL = `https://ntfy.sh/${RELAY_TOPIC}`;
const RELAY_POLL_URL = `https://ntfy.sh/${RELAY_TOPIC}/json?poll=1&since=12h`;

function generateReviewId(): string {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 6).toUpperCase()
      : Math.random().toString(36).slice(2, 8).toUpperCase();
  return `GS-${datePart}-${rand}`;
}

function formatLocalDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatLocalTime(date: Date): string {
  return [
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
    String(date.getSeconds()).padStart(2, '0'),
  ].join(':');
}

async function postReviewToLocalServer(record: ReviewRecord): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 2000);
    const res = await fetch('./api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
      signal: controller.signal,
    });
    window.clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

async function postReviewToRelay(record: ReviewRecord): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 5000);
    const res = await fetch(RELAY_POST_URL, {
      method: 'POST',
      body: JSON.stringify(record),
      signal: controller.signal,
    });
    window.clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

async function fetchReviewsFromRelay(): Promise<{
  reviews: ReviewRecord[];
  connected: boolean;
}> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { reviews: [], connected: false };
  }
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 5000);
    const res = await fetch(RELAY_POLL_URL, { signal: controller.signal });
    window.clearTimeout(timer);
    if (!res.ok) {
      return { reviews: [], connected: false };
    }
    const text = await res.text();
    const parsed: ReviewRecord[] = [];
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const envelope = JSON.parse(trimmed) as { event?: string; message?: string };
        if (envelope.event !== 'message' || typeof envelope.message !== 'string') {
          continue;
        }
        const item = JSON.parse(envelope.message) as Partial<ReviewRecord>;
        const rating = Number(item?.starRating);
        if (
          item &&
          typeof item.reviewId === 'string' &&
          item.reviewId.trim().length > 0 &&
          Number.isInteger(rating) &&
          rating >= 1 &&
          rating <= 5
        ) {
          parsed.push({
            reviewId: item.reviewId.trim(),
            submissionDate: String(item.submissionDate || ''),
            submissionTime: String(item.submissionTime || ''),
            createdAtIso: String(item.createdAtIso || new Date().toISOString()),
            starRating: rating as StarRating,
            selectedReactions: Array.isArray(item.selectedReactions)
              ? item.selectedReactions.map(String)
              : [],
            suggestions: String(item.suggestions || ''),
            synced: 1,
          });
        }
      } catch {
        // Ignore malformed lines
      }
    }
    return { reviews: parsed, connected: true };
  } catch {
    return { reviews: [], connected: false };
  }
}

export async function submitReview(input: NewReviewInput): Promise<{
  record: ReviewRecord;
  syncedToServer: boolean;
}> {
  const now = new Date();
  const record: ReviewRecord = {
    reviewId: generateReviewId(),
    submissionDate: formatLocalDate(now),
    submissionTime: formatLocalTime(now),
    createdAtIso: now.toISOString(),
    starRating: input.starRating,
    selectedReactions: [...input.selectedReactions],
    suggestions: input.suggestions.trim(),
    synced: 0,
  };

  // 1. Always persist transactionally in IndexedDB first.
  const saved = await saveReviewLocally(record);

  // 2. Sync to cross-device GitHub Pages relay AND optional local SQLite server.
  const [relayOk, localOk] = await Promise.all([
    postReviewToRelay(saved),
    postReviewToLocalServer(saved),
  ]);

  const synced = relayOk || localOk;
  if (synced) {
    await markReviewSynced(saved.reviewId);
    saved.synced = 1;
  }

  // Notify any open admin tab on the same device immediately
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const ch = new BroadcastChannel('gau-samvardhan-reviews');
      ch.postMessage({ type: 'review-added', reviewId: saved.reviewId });
      ch.close();
    } catch {
      // Ignore if BroadcastChannel is unavailable
    }
  }

  return { record: saved, syncedToServer: synced };
}

export async function syncPendingReviews(): Promise<number> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 0;
  }
  const pending = await getUnsyncedReviews();
  let syncedCount = 0;
  for (const record of pending) {
    const [relayOk, localOk] = await Promise.all([
      postReviewToRelay(record),
      postReviewToLocalServer(record),
    ]);
    if (relayOk || localOk) {
      await markReviewSynced(record.reviewId);
      syncedCount += 1;
    }
  }
  return syncedCount;
}

export async function fetchAllReviews(): Promise<{
  reviews: ReviewRecord[];
  serverConnected: boolean;
}> {
  // Flush any unsynced local reviews in background
  void syncPendingReviews();

  const [localReviews, relayResult] = await Promise.all([
    getLocalReviews(),
    fetchReviewsFromRelay(),
  ]);

  // Persist newly fetched phone reviews permanently into this desktop's IndexedDB
  if (relayResult.reviews.length > 0) {
    await mergeReviewsLocally(relayResult.reviews);
  }

  let serverReviews: ReviewRecord[] = [];
  let localServerConnected = false;

  if (typeof navigator === 'undefined' || navigator.onLine) {
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 1500);
      const res = await fetch('./api/reviews', { signal: controller.signal });
      window.clearTimeout(timer);
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = (await res.json()) as { reviews?: ReviewRecord[] };
          if (Array.isArray(data.reviews)) {
            serverReviews = data.reviews.map((r) => ({ ...r, synced: 1 }));
            localServerConnected = true;
          }
        }
      }
    } catch {
      localServerConnected = false;
    }
  }

  const mergedMap = new Map<string, ReviewRecord>();
  for (const r of localReviews) {
    mergedMap.set(r.reviewId, r);
  }
  for (const r of relayResult.reviews) {
    mergedMap.set(r.reviewId, r);
  }
  for (const r of serverReviews) {
    mergedMap.set(r.reviewId, r);
  }

  const merged = Array.from(mergedMap.values()).sort((a, b) =>
    b.createdAtIso.localeCompare(a.createdAtIso)
  );

  return {
    reviews: merged,
    serverConnected: relayResult.connected || localServerConnected,
  };
}

export async function restoreReviewsBackup(
  records: ReviewRecord[]
): Promise<{ localAdded: number; serverSynced: boolean }> {
  const normalized = records.map((r) => ({
    ...r,
    synced: 0,
  }));

  const localAdded = await mergeReviewsLocally(normalized);

  let serverSynced = false;
  if (typeof navigator === 'undefined' || navigator.onLine) {
    try {
      const res = await fetch('./api/reviews/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews: normalized }),
      });
      if (res.ok) {
        serverSynced = true;
        for (const r of normalized) {
          await markReviewSynced(r.reviewId);
        }
      }
    } catch {
      serverSynced = false;
    }
  }

  return { localAdded, serverSynced };
}
