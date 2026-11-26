import { useEffect, useRef, useState } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { REACTION_OPTIONS, type StarRating } from '../types/review';
import { submitReview } from '../services/reviewService';
import { StarRatingInput } from './StarRatingInput';

export function FeedbackForm() {
  const [rating, setRating] = useState<StarRating | null>(null);
  const [selectedReactions, setSelectedReactions] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const submittingRef = useRef(false);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const toggleReaction = (reaction: string) => {
    setSelectedReactions((prev) =>
      prev.includes(reaction) ? prev.filter((item) => item !== reaction) : [...prev, reaction]
    );
  };

  const resetForm = () => {
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    setRating(null);
    setSelectedReactions([]);
    setSuggestions('');
    setValidationError(null);
    setStorageError(null);
    setShowSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || isSubmitting) {
      return;
    }

    if (!rating) {
      setValidationError('Please select a star rating before submitting.');
      return;
    }

    setValidationError(null);
    setStorageError(null);
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      await submitReview({
        starRating: rating,
        selectedReactions,
        suggestions,
      });

      setShowSuccess(true);
      resetTimerRef.current = window.setTimeout(() => {
        resetForm();
      }, 3200);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Could not save your feedback to local storage. Please try again.';
      setStorageError(message);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div
        className="animate-subtle-pop flex flex-col items-center justify-center rounded-[28px] border border-[#E4E7DE] bg-white px-6 py-14 text-center shadow-[0_14px_44px_-16px_rgba(23,77,54,0.12)] sm:px-10"
        role="status"
        aria-live="polite"
      >
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#174D36] text-white shadow-sm ring-8 ring-[#A4B89B]/20">
          <Check className="h-8 w-8" strokeWidth={2.5} />
        </div>
        <h2 className="font-editorial text-3xl font-semibold tracking-tight text-[#1C2420] sm:text-4xl">
          Thank You!
        </h2>
        <p className="mt-2.5 max-w-md text-base text-[#5A655F] sm:text-lg">
          Your feedback means a lot to Team Gau Samvardhan.
        </p>
        <button
          type="button"
          onClick={resetForm}
          className="mt-7 rounded-full border border-[#DCE0D5] bg-[#F8F8F3] px-5 py-2.5 text-sm font-medium text-[#174D36] transition-colors hover:bg-[#EEF1E8]"
        >
          Ready for Next Visitor →
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-[24px] border border-[#E4E7DE] bg-white p-5 shadow-[0_14px_44px_-16px_rgba(23,77,54,0.10)] sm:rounded-[28px] sm:p-10"
    >
      <div className="space-y-6 sm:space-y-8">
        {/* Question 1: Star Rating */}
        <div>
          <label className="block text-lg font-semibold tracking-tight text-[#1C2420] sm:text-xl">
            How did you like our project?
          </label>
          <div className="mt-3.5">
            <StarRatingInput
              value={rating}
              onChange={(next) => {
                setRating(next);
                if (validationError) setValidationError(null);
              }}
              disabled={isSubmitting}
            />
          </div>
          {validationError && (
            <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[#B44332]" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{validationError}</span>
            </p>
          )}
        </div>

        <hr className="border-[#EEF0E8]" />

        {/* Question 2: Quick Reaction Chips */}
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <label className="block text-lg font-semibold tracking-tight text-[#1C2420] sm:text-xl">
              What impressed you?
            </label>
            <span className="text-xs font-medium text-[#76827B]">Optional</span>
          </div>
          <div className="mt-3.5 flex flex-wrap gap-2.5">
            {REACTION_OPTIONS.map((reaction) => {
              const isSelected = selectedReactions.includes(reaction);
              return (
                <button
                  key={reaction}
                  type="button"
                  aria-pressed={isSelected}
                  disabled={isSubmitting}
                  onClick={() => toggleReaction(reaction)}
                  className={`min-h-[44px] rounded-full border px-4 py-2 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#174D36] focus-visible:ring-offset-2 sm:text-[15px] ${
                    isSelected
                      ? 'border-[#174D36] bg-[#174D36] text-white shadow-xs'
                      : 'border-[#DCE0D5] bg-[#F8F8F3] text-[#1C2420] hover:border-[#A4B89B] hover:bg-[#F0F2EA]'
                  } disabled:opacity-60`}
                >
                  {reaction}
                </button>
              );
            })}
          </div>
        </div>

        <hr className="border-[#EEF0E8]" />

        {/* Question 3: Optional Suggestion */}
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="suggestions-input"
              className="block text-lg font-semibold tracking-tight text-[#1C2420] sm:text-xl"
            >
              Any suggestions?
            </label>
            <span className="text-xs font-medium text-[#76827B]">Optional</span>
          </div>
          <textarea
            id="suggestions-input"
            rows={2}
            maxLength={1000}
            disabled={isSubmitting}
            value={suggestions}
            onChange={(e) => setSuggestions(e.target.value)}
            placeholder="Share your thoughts (optional)..."
            className="mt-3 w-full resize-none rounded-2xl border border-[#DCE0D5] bg-[#F8F8F3]/70 px-4 py-3 text-[16px] text-[#1C2420] placeholder:text-[#86918B] transition-colors focus:border-[#174D36] focus:bg-white focus:outline-none"
          />
        </div>

        {storageError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-2xl border border-[#E5B8B0] bg-[#FDF4F2] p-4 text-sm text-[#9B3324]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{storageError}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex min-h-[56px] w-full items-center justify-center rounded-full bg-[#174D36] px-8 py-4 text-base font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[#123E2B] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#174D36] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-65 sm:text-lg"
        >
          {isSubmitting ? 'Saving Review...' : 'Submit Review →'}
        </button>
      </div>
    </form>
  );
}
