import {
  getLocalReviews,
  getUnsyncedReviews,
  markReviewSynced,
  mergeReviewsLocally,
  saveReviewLocally,
} from '../database/db';
import type { NewReviewInput, ReviewRecord } from '../types/review';

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

async function postReviewToServer(record: ReviewRecord): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 3000);
    const res = await fetch('/api/reviews', {
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
  // If IndexedDB fails, this throws and the UI will NOT show success.
  const saved = await saveReviewLocally(record);

  // 2. Best-effort immediate sync to shared Wi-Fi SQLite server (if running).
  const synced = await postReviewToServer(saved);
  if (synced) {
    await markReviewSynced(saved.reviewId);
    saved.synced = 1;
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
    const ok = await postReviewToServer(record);
    if (ok) {
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
  // Flush any pending local reviews first
  await syncPendingReviews();

  const localReviews = await getLocalReviews();
  let serverReviews: ReviewRecord[] = [];
  let serverConnected = false;

  if (typeof navigator === 'undefined' || navigator.onLine) {
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 3000);
      const res = await fetch('/api/reviews', { signal: controller.signal });
      window.clearTimeout(timer);
      if (res.ok) {
        const data = (await res.json()) as { reviews?: ReviewRecord[] };
        if (Array.isArray(data.reviews)) {
          serverReviews = data.reviews.map((r) => ({ ...r, synced: 1 }));
          serverConnected = true;
        }
      }
    } catch {
      serverConnected = false;
    }
  }

  // Merge by reviewId without losing any local or server records
  const mergedMap = new Map<string, ReviewRecord>();
  for (const r of localReviews) {
    mergedMap.set(r.reviewId, r);
  }
  for (const r of serverReviews) {
    mergedMap.set(r.reviewId, r);
  }

  const merged = Array.from(mergedMap.values()).sort((a, b) =>
    b.createdAtIso.localeCompare(a.createdAtIso)
  );

  return { reviews: merged, serverConnected };
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
      const res = await fetch('/api/reviews/restore', {
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
