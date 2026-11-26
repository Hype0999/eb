import Dexie, { type Table } from 'dexie';
import type { ReviewRecord } from '../types/review';

class GauSamvardhanDB extends Dexie {
  reviews!: Table<ReviewRecord, string>;

  constructor() {
    super('GauSamvardhanFeedbackDB');
    this.version(1).stores({
      reviews: 'reviewId, createdAtIso, starRating, synced',
    });
  }
}

export const db = new GauSamvardhanDB();

export async function saveReviewLocally(record: ReviewRecord): Promise<ReviewRecord> {
  await db.transaction('rw', db.reviews, async () => {
    const existing = await db.reviews.get(record.reviewId);
    if (!existing) {
      await db.reviews.add(record);
    }
  });
  const saved = await db.reviews.get(record.reviewId);
  if (!saved) {
    throw new Error('Failed to verify review persistence in IndexedDB.');
  }
  return saved;
}

export async function getLocalReviews(): Promise<ReviewRecord[]> {
  return db.reviews.orderBy('createdAtIso').reverse().toArray();
}

export async function getUnsyncedReviews(): Promise<ReviewRecord[]> {
  return db.reviews.where('synced').equals(0).toArray();
}

export async function markReviewSynced(reviewId: string): Promise<void> {
  await db.transaction('rw', db.reviews, async () => {
    await db.reviews.update(reviewId, { synced: 1 });
  });
}

export async function mergeReviewsLocally(records: ReviewRecord[]): Promise<number> {
  let addedCount = 0;
  await db.transaction('rw', db.reviews, async () => {
    for (const record of records) {
      const existing = await db.reviews.get(record.reviewId);
      if (!existing) {
        await db.reviews.add(record);
        addedCount += 1;
      }
    }
  });
  return addedCount;
}
