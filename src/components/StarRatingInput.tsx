import { useState } from 'react';
import { Star } from 'lucide-react';
import type { StarRating } from '../types/review';

interface StarRatingInputProps {
  value: StarRating | null;
  onChange: (rating: StarRating) => void;
  disabled?: boolean;
}

const RATING_LABELS: Record<StarRating, string> = {
  1: '1 Star — Needs Work',
  2: '2 Stars — Fair',
  3: '3 Stars — Good',
  4: '4 Stars — Very Good',
  5: '5 Stars — Outstanding',
};

const STARS: StarRating[] = [1, 2, 3, 4, 5];

export function StarRatingInput({ value, onChange, disabled = false }: StarRatingInputProps) {
  const [hovered, setHovered] = useState<StarRating | null>(null);
  const activeRating = hovered ?? value ?? 0;

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="How did you like our project?"
        className="grid grid-cols-5 gap-2 sm:flex sm:items-center sm:justify-start sm:gap-3"
        onMouseLeave={() => setHovered(null)}
      >
        {STARS.map((star) => {
          const isFilled = star <= activeRating;
          const isSelected = value === star;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${star} ${star === 1 ? 'Star' : 'Stars'}`}
              disabled={disabled}
              onMouseEnter={() => setHovered(star)}
              onClick={() => onChange(star)}
              className={`group flex h-13 w-full sm:h-14 sm:w-14 items-center justify-center rounded-2xl border transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#174D36] focus-visible:ring-offset-2 ${
                isFilled
                  ? 'border-[#C7A45B]/50 bg-[#C7A45B]/12 scale-[1.03]'
                  : 'border-[#E5E7DF] bg-[#F8F8F3] hover:border-[#C7A45B]/40 hover:bg-[#C7A45B]/6'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <Star
                className={`h-7 w-7 sm:h-8 sm:w-8 transition-transform duration-150 group-active:scale-90 ${
                  isFilled
                    ? 'fill-[#C7A45B] text-[#C7A45B]'
                    : 'fill-transparent text-[#9BA59F] group-hover:text-[#C7A45B]'
                }`}
                strokeWidth={1.75}
              />
            </button>
          );
        })}
      </div>
      <p className="mt-2.5 min-h-[1.25rem] text-sm font-medium text-[#5A655F]">
        {activeRating > 0 ? RATING_LABELS[activeRating as StarRating] : 'Tap a star to rate (required)'}
      </p>
    </div>
  );
}
