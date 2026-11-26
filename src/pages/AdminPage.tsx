import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  KeyRound,
  Lock,
  RefreshCw,
  Star,
  Upload,
} from 'lucide-react';
import { OfflineBadge } from '../components/OfflineBadge';
import {
  computeReviewStats,
  exportToCsv,
  exportToExcel,
  exportToJsonBackup,
  parseJsonBackup,
} from '../services/exportService';
import { fetchAllReviews, restoreReviewsBackup } from '../services/reviewService';
import type { ReviewRecord, StarRating } from '../types/review';

const ADMIN_PIN_STORAGE_KEY = 'gs_admin_pin';
const DEFAULT_ADMIN_PIN = '2026';

function getStoredPin(): string {
  try {
    return localStorage.getItem(ADMIN_PIN_STORAGE_KEY) || DEFAULT_ADMIN_PIN;
  } catch {
    return DEFAULT_ADMIN_PIN;
  }
}

export function AdminPage({ onBackToVisitor }: { onBackToVisitor: () => void }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [serverConnected, setServerConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showPinSettings, setShowPinSettings] = useState(false);
  const [newPin, setNewPin] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await fetchAllReviews();
      setReviews(result.reviews);
      setServerConnected(result.serverConnected);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load reviews.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (unlocked) {
      void loadData();
    }
  }, [unlocked, loadData]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === getStoredPin()) {
      setUnlocked(true);
      setPinError(null);
      setPinInput('');
    } else {
      setPinError('Incorrect PIN. Please try again.');
    }
  };

  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newPin.trim();
    if (cleaned.length < 4) {
      setErrorMessage('Admin PIN must be at least 4 characters.');
      return;
    }
    try {
      localStorage.setItem(ADMIN_PIN_STORAGE_KEY, cleaned);
      setNewPin('');
      setShowPinSettings(false);
      setErrorMessage(null);
      setStatusMessage('Local admin PIN updated for this browser.');
    } catch {
      setErrorMessage('Could not save PIN to browser storage.');
    }
  };

  const handleExcelDownload = () => {
    const filename = exportToExcel(reviews);
    setStatusMessage(`Downloaded ${filename} (${reviews.length} reviews).`);
  };

  const handleCsvDownload = () => {
    const filename = exportToCsv(reviews);
    setStatusMessage(`Downloaded ${filename}.`);
  };

  const handleJsonDownload = () => {
    const filename = exportToJsonBackup(reviews);
    setStatusMessage(`Downloaded ${filename}.`);
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMessage(null);
    try {
      const parsed = await parseJsonBackup(file);
      const { localAdded, serverSynced } = await restoreReviewsBackup(parsed);
      await loadData();
      setStatusMessage(
        `Restored backup: ${parsed.length} records processed (${localAdded} new locally${
          serverSynced ? ', synced to shared SQLite' : ''
        }).`
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to restore JSON backup.');
    }
  };

  if (!unlocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8F8F3] px-5 py-12 text-[#1C2420]">
        <div className="w-full max-w-md rounded-[28px] border border-[#E4E7DE] bg-white p-8 shadow-[0_14px_44px_-16px_rgba(23,77,54,0.12)]">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#174D36]/10 text-[#174D36]">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="font-editorial text-2xl font-semibold text-[#1C2420]">
            Admin Dashboard
          </h1>
          <p className="mt-1.5 text-sm text-[#5A655F]">
            Gau Samvardhan Exhibition · Enter your local admin PIN to view analytics and export reviews.
          </p>

          <form onSubmit={handleUnlock} className="mt-6 space-y-4">
            <div>
              <label htmlFor="admin-pin" className="block text-sm font-medium text-[#1C2420]">
                Admin PIN
              </label>
              <input
                id="admin-pin"
                type="password"
                inputMode="numeric"
                autoFocus
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter PIN (default: 2026)"
                className="mt-1.5 w-full rounded-xl border border-[#DCE0D5] bg-[#F8F8F3] px-4 py-3 text-base text-[#1C2420] focus:border-[#174D36] focus:bg-white focus:outline-none"
              />
              {pinError && <p className="mt-1.5 text-sm text-[#B44332]">{pinError}</p>}
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-[#174D36] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#123E2B]"
            >
              Unlock Dashboard
            </button>
          </form>

          <p className="mt-5 rounded-xl bg-[#F8F8F3] p-3 text-xs leading-relaxed text-[#5A655F]">
            Note: In a locally hosted offline app, this PIN is stored in your browser to prevent casual visitor access rather than providing server-grade cryptographic security.
          </p>

          <button
            type="button"
            onClick={onBackToVisitor}
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[#174D36] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Visitor Page
          </button>
        </div>
      </div>
    );
  }

  const stats = computeReviewStats(reviews);
  const starsOrder: StarRating[] = [5, 4, 3, 2, 1];

  return (
    <div className="min-h-screen bg-[#F8F8F3] text-[#1C2420]">
      <header className="border-b border-[#E6E8E0] bg-white/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToVisitor}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#DCE0D5] bg-[#F8F8F3] text-[#1C2420] hover:bg-[#ECEFE6]"
              title="Back to Visitor Page"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="font-editorial text-xl font-semibold text-[#1C2420] sm:text-2xl">
                Gau Samvardhan — Admin
              </h1>
              <p className="text-xs text-[#5A655F]">
                {serverConnected
                  ? 'Connected to shared Wi-Fi SQLite + Local IndexedDB'
                  : 'Local IndexedDB Mode (Offline)'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <OfflineBadge />
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#DCE0D5] bg-white px-3.5 py-2 text-xs font-medium text-[#1C2420] hover:bg-[#F8F8F3]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowPinSettings((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#DCE0D5] bg-white px-3.5 py-2 text-xs font-medium text-[#1C2420] hover:bg-[#F8F8F3]"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Change PIN
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-5 py-8 sm:px-8">
        {showPinSettings && (
          <div className="rounded-2xl border border-[#DCE0D5] bg-white p-5 shadow-xs">
            <h2 className="text-sm font-semibold text-[#1C2420]">Configure Local Admin PIN</h2>
            <p className="mt-1 text-xs text-[#5A655F]">
              Stored in this browser&apos;s localStorage. Useful for hiding the admin view on an exhibition kiosk, though not a substitute for remote server authentication.
            </p>
            <form onSubmit={handleSaveNewPin} className="mt-3 flex flex-wrap items-center gap-3">
              <input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="New PIN (min 4 chars)"
                className="rounded-xl border border-[#DCE0D5] bg-[#F8F8F3] px-3.5 py-2 text-sm focus:border-[#174D36] focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-full bg-[#174D36] px-4 py-2 text-xs font-semibold text-white hover:bg-[#123E2B]"
              >
                Save PIN
              </button>
            </form>
          </div>
        )}

        {statusMessage && (
          <div className="flex items-center gap-2 rounded-2xl border border-[#A4B89B] bg-white px-4 py-3 text-sm text-[#174D36]">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-[#E5B8B0] bg-[#FDF4F2] px-4 py-3 text-sm text-[#9B3324]">
            {errorMessage}
          </div>
        )}

        {/* Export & Backup Bar */}
        <section className="rounded-[24px] border border-[#E4E7DE] bg-white p-5 shadow-xs sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#1C2420]">Export &amp; Backup</h2>
              <p className="text-xs text-[#5A655F]">
                Exporting generates a file immediately and never deletes stored database records.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleExcelDownload}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#174D36] px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#123E2B]"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Download Excel Reviews ↓
              </button>
              <button
                type="button"
                onClick={handleCsvDownload}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#DCE0D5] bg-[#F8F8F3] px-4 py-2.5 text-sm font-medium text-[#1C2420] hover:bg-[#ECEFE6]"
              >
                <FileText className="h-4 w-4" />
                Download CSV
              </button>
              <button
                type="button"
                onClick={handleJsonDownload}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#DCE0D5] bg-[#F8F8F3] px-4 py-2.5 text-sm font-medium text-[#1C2420] hover:bg-[#ECEFE6]"
              >
                <Download className="h-4 w-4" />
                Download JSON Backup
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#DCE0D5] bg-[#F8F8F3] px-4 py-2.5 text-sm font-medium text-[#1C2420] hover:bg-[#ECEFE6]"
              >
                <Upload className="h-4 w-4" />
                Restore JSON Backup
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleRestoreFile}
                className="hidden"
              />
            </div>
          </div>
        </section>

        {/* Key Metrics */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[24px] border border-[#E4E7DE] bg-white p-6 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5A655F]">
              Total Reviews
            </p>
            <p className="font-editorial mt-2 text-4xl font-semibold text-[#1C2420]">
              {stats.totalReviews}
            </p>
          </div>
          <div className="rounded-[24px] border border-[#E4E7DE] bg-white p-6 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5A655F]">
              Average Star Rating
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-editorial text-4xl font-semibold text-[#1C2420]">
                {stats.averageRating.toFixed(2)}
              </span>
              <span className="text-sm text-[#5A655F]">/ 5.0</span>
            </div>
          </div>
          <div className="rounded-[24px] border border-[#E4E7DE] bg-white p-6 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5A655F]">
              Five-Star Reviews
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-editorial text-4xl font-semibold text-[#174D36]">
                {stats.fiveStarCount}
              </span>
              <span className="text-sm text-[#5A655F]">
                ({stats.totalReviews > 0 ? Math.round((stats.fiveStarCount / stats.totalReviews) * 100) : 0}%)
              </span>
            </div>
          </div>
        </section>

        {/* Distribution & Reactions */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[24px] border border-[#E4E7DE] bg-white p-6 shadow-xs">
            <h2 className="text-base font-semibold text-[#1C2420]">Rating Distribution</h2>
            <div className="mt-4 space-y-3">
              {starsOrder.map((star) => {
                const count = stats.ratingDistribution[star];
                const pct = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3 text-sm">
                    <span className="flex w-14 items-center gap-1 font-medium text-[#1C2420]">
                      {star}
                      <Star className="h-3.5 w-3.5 fill-[#C7A45B] text-[#C7A45B]" />
                    </span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#EEF0E8]">
                      <div
                        className="h-full rounded-full bg-[#174D36] transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-10 text-right font-medium text-[#5A655F]">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#E4E7DE] bg-white p-6 shadow-xs">
            <h2 className="text-base font-semibold text-[#1C2420]">Most Selected Reactions</h2>
            <div className="mt-4 space-y-2.5">
              {stats.reactionCounts.map((item) => {
                const pct = stats.totalReviews > 0 ? (item.count / stats.totalReviews) * 100 : 0;
                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-xl bg-[#F8F8F3] px-4 py-2.5 text-sm"
                  >
                    <span className="font-medium text-[#1C2420]">{item.label}</span>
                    <span className="font-semibold text-[#174D36]">
                      {item.count}{' '}
                      <span className="text-xs font-normal text-[#5A655F]">
                        ({Math.round(pct)}%)
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Recent Feedback */}
        <section className="rounded-[24px] border border-[#E4E7DE] bg-white p-6 shadow-xs">
          <h2 className="text-base font-semibold text-[#1C2420]">
            Recent Feedback ({reviews.length})
          </h2>

          {reviews.length === 0 ? (
            <p className="mt-4 text-sm text-[#5A655F]">
              No reviews submitted yet. Share the visitor page to start collecting feedback.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E6E8E0] text-xs font-semibold uppercase tracking-wider text-[#5A655F]">
                    <th className="py-3 pr-4">Review ID</th>
                    <th className="py-3 pr-4">Date &amp; Time</th>
                    <th className="py-3 pr-4">Rating</th>
                    <th className="py-3 pr-4">Reactions</th>
                    <th className="py-3">Suggestions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F2EA]">
                  {reviews.map((r) => (
                    <tr key={r.reviewId} className="align-top">
                      <td className="py-3.5 pr-4 font-mono text-xs text-[#4E5953]">
                        {r.reviewId}
                      </td>
                      <td className="py-3.5 pr-4 whitespace-nowrap text-xs text-[#4E5953]">
                        {r.submissionDate} · {r.submissionTime}
                      </td>
                      <td className="py-3.5 pr-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#C7A45B]/15 px-2.5 py-0.5 text-xs font-semibold text-[#8C6D2B]">
                          {r.starRating} ★
                        </span>
                      </td>
                      <td className="py-3.5 pr-4">
                        {r.selectedReactions.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {r.selectedReactions.map((rx) => (
                              <span
                                key={rx}
                                className="rounded-full bg-[#F8F8F3] px-2.5 py-0.5 text-xs text-[#1C2420]"
                              >
                                {rx}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-[#8A958F]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 text-sm text-[#1C2420]">
                        {r.suggestions || <span className="text-xs text-[#8A958F]">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
