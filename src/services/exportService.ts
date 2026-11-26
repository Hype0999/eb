import * as XLSX from 'xlsx';
import {
  REACTION_OPTIONS,
  type BackupPayload,
  type ReviewRecord,
  type ReviewStats,
  type StarRating,
} from '../types/review';

export function computeReviewStats(reviews: ReviewRecord[]): ReviewStats {
  const distribution: Record<StarRating, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  const reactionMap = new Map<string, number>();
  for (const opt of REACTION_OPTIONS) {
    reactionMap.set(opt, 0);
  }

  let ratingSum = 0;

  for (const review of reviews) {
    const rating = review.starRating;
    if (rating >= 1 && rating <= 5) {
      distribution[rating] += 1;
      ratingSum += rating;
    }
    for (const reaction of review.selectedReactions) {
      reactionMap.set(reaction, (reactionMap.get(reaction) || 0) + 1);
    }
  }

  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 ? Number((ratingSum / totalReviews).toFixed(2)) : 0;

  const reactionCounts = Array.from(reactionMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalReviews,
    averageRating,
    fiveStarCount: distribution[5],
    ratingDistribution: distribution,
    reactionCounts,
  };
}

function getTodayDateString(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportToExcel(reviews: ReviewRecord[]): string {
  const stats = computeReviewStats(reviews);
  const dateStr = getTodayDateString();
  const filename = `Gau_Samvardhan_Reviews_${dateStr}.xlsx`;

  // SHEET 1: REVIEWS
  const reviewRows = reviews.map((r) => ({
    'Review ID': r.reviewId,
    'Submission Date': r.submissionDate,
    'Submission Time': r.submissionTime,
    'Star Rating': r.starRating,
    'Selected Reactions': r.selectedReactions.join(', '),
    Suggestions: r.suggestions,
  }));

  const reviewsSheet = XLSX.utils.json_to_sheet(
    reviewRows.length > 0
      ? reviewRows
      : [
          {
            'Review ID': '',
            'Submission Date': '',
            'Submission Time': '',
            'Star Rating': '',
            'Selected Reactions': '',
            Suggestions: '',
          },
        ]
  );

  reviewsSheet['!cols'] = [
    { wch: 20 }, // Review ID
    { wch: 16 }, // Submission Date
    { wch: 16 }, // Submission Time
    { wch: 13 }, // Star Rating
    { wch: 42 }, // Selected Reactions
    { wch: 48 }, // Suggestions
  ];

  // SHEET 2: SUMMARY
  const summaryRows: Array<{ Metric: string; Value: string | number }> = [
    { Metric: 'Project', Value: 'Gau Samvardhan — Smart Cattle Welfare & Monitoring System' },
    { Metric: 'Export Date', Value: dateStr },
    { Metric: 'Total Reviews', Value: stats.totalReviews },
    { Metric: 'Average Rating', Value: stats.averageRating },
    { Metric: '1-Star Reviews', Value: stats.ratingDistribution[1] },
    { Metric: '2-Star Reviews', Value: stats.ratingDistribution[2] },
    { Metric: '3-Star Reviews', Value: stats.ratingDistribution[3] },
    { Metric: '4-Star Reviews', Value: stats.ratingDistribution[4] },
    { Metric: '5-Star Reviews', Value: stats.ratingDistribution[5] },
    { Metric: '', Value: '' },
    { Metric: 'Reaction Statistics', Value: 'Count' },
    ...stats.reactionCounts.map((item) => ({
      Metric: item.label,
      Value: item.count,
    })),
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 36 }, { wch: 52 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, reviewsSheet, 'REVIEWS');
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'SUMMARY');

  XLSX.writeFile(workbook, filename);
  return filename;
}

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCsv(reviews: ReviewRecord[]): string {
  const dateStr = getTodayDateString();
  const filename = `Gau_Samvardhan_Reviews_${dateStr}.csv`;
  const headers = [
    'Review ID',
    'Submission Date',
    'Submission Time',
    'Star Rating',
    'Selected Reactions',
    'Suggestions',
  ];

  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...reviews.map((r) =>
      [
        r.reviewId,
        r.submissionDate,
        r.submissionTime,
        r.starRating,
        r.selectedReactions.join('; '),
        r.suggestions,
      ]
        .map(escapeCsvCell)
        .join(',')
    ),
  ];

  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  triggerDownload(blob, filename);
  return filename;
}

export function exportToJsonBackup(reviews: ReviewRecord[]): string {
  const dateStr = getTodayDateString();
  const filename = `Gau_Samvardhan_Backup_${dateStr}.json`;

  const payload: BackupPayload = {
    app: 'gau-samvardhan-feedback',
    version: 1,
    exportedAt: new Date().toISOString(),
    count: reviews.length,
    reviews,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  triggerDownload(blob, filename);
  return filename;
}

export async function parseJsonBackup(file: File): Promise<ReviewRecord[]> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Partial<BackupPayload> | ReviewRecord[];

  const rawList = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.reviews)
      ? parsed.reviews
      : null;

  if (!rawList) {
    throw new Error('Invalid backup file format.');
  }

  const valid: ReviewRecord[] = [];
  for (const item of rawList) {
    const rating = Number(item?.starRating);
    if (
      item &&
      typeof item.reviewId === 'string' &&
      item.reviewId.trim().length > 0 &&
      Number.isInteger(rating) &&
      rating >= 1 &&
      rating <= 5
    ) {
      valid.push({
        reviewId: item.reviewId.trim(),
        submissionDate: String(item.submissionDate || ''),
        submissionTime: String(item.submissionTime || ''),
        createdAtIso: String(item.createdAtIso || new Date().toISOString()),
        starRating: rating as StarRating,
        selectedReactions: Array.isArray(item.selectedReactions)
          ? item.selectedReactions.map(String)
          : [],
        suggestions: String(item.suggestions || ''),
        synced: Number(item.synced) === 1 ? 1 : 0,
      });
    }
  }

  if (valid.length === 0 && rawList.length > 0) {
    throw new Error('No valid review records found in backup file.');
  }

  return valid;
}
