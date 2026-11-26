export type StarRating = 1 | 2 | 3 | 4 | 5;

export const REACTION_OPTIONS = [
  'Innovative 💡',
  'Very Useful ❤️',
  'Impressive 👏',
  'Great Social Impact 🌱',
  'Needs Improvement',
] as const;

export type ReactionOption = (typeof REACTION_OPTIONS)[number];

export interface ReviewRecord {
  reviewId: string;
  submissionDate: string; // YYYY-MM-DD (local)
  submissionTime: string; // HH:mm:ss (local 24h)
  createdAtIso: string;   // ISO timestamp for sorting
  starRating: StarRating;
  selectedReactions: string[];
  suggestions: string;
  synced: number; // 0 = local only, 1 = synced to shared server
}

export interface NewReviewInput {
  starRating: StarRating;
  selectedReactions: string[];
  suggestions: string;
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  fiveStarCount: number;
  ratingDistribution: Record<StarRating, number>;
  reactionCounts: Array<{ label: string; count: number }>;
}

export interface BackupPayload {
  app: 'gau-samvardhan-feedback';
  version: 1;
  exportedAt: string;
  count: number;
  reviews: ReviewRecord[];
}
