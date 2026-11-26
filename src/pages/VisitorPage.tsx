import { useState } from 'react';
import exhibitionPhoto from '../assets/gau-samvardhan-exhibition.jpg';
import { OfflineBadge } from '../components/OfflineBadge';
import { FeedbackForm } from '../components/FeedbackForm';

export function VisitorPage() {
  const [imageError, setImageError] = useState(false);

  const scrollToFeedback = () => {
    const el = document.getElementById('feedback-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F3] text-[#1C2420]">
      {/* Subtle Top Status Bar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 pt-4 pb-1 sm:px-8 sm:pt-7">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#174D36] sm:text-xs">
          Exhibition Showcase
        </span>
        <OfflineBadge />
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-3 pb-12 sm:px-8 sm:pt-8 sm:pb-24">
        {/* Hero Section */}
        <section className="grid items-center gap-6 lg:grid-cols-12 lg:gap-12">
          {/* Left: Editorial Project Identity */}
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C7A45B]/40 bg-[#C7A45B]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#8C6D2B] sm:px-3.5 sm:text-xs">
              Smart Cattle Welfare &amp; Monitoring System
            </div>

            <h1 className="font-editorial mt-3.5 text-[34px] leading-[1.08] font-semibold tracking-tight text-[#1C2420] sm:mt-5 sm:text-5xl lg:text-6xl">
              GAU SAMVARDHAN
            </h1>

            <p className="mt-3 max-w-xl text-base leading-relaxed text-[#4E5953] sm:mt-4 sm:text-xl">
              Technology for better cattle welfare, smarter monitoring and a safer future.
            </p>

            <p className="mt-2.5 text-sm font-medium text-[#174D36] sm:text-base">
              Presented by Kartikeya Saini &amp; Aaryesh Dandapat
            </p>

            <div className="mt-5 flex flex-col items-stretch gap-2.5 sm:mt-8 sm:flex-row sm:items-center sm:gap-4">
              <button
                type="button"
                onClick={scrollToFeedback}
                className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-[#174D36] px-7 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[#123E2B] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#174D36] focus-visible:ring-offset-2 sm:w-auto sm:px-8"
              >
                Share Your Feedback
              </button>
              <span className="text-center text-xs font-medium text-[#6B7670] sm:text-left sm:text-sm">
                Takes just 15 seconds
              </span>
            </div>
          </div>

          {/* Right: Actual Exhibition Photograph */}
          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-[24px] border border-[#E2E5DC] bg-white p-2 shadow-[0_18px_50px_-20px_rgba(23,77,54,0.16)] sm:rounded-[28px] sm:p-3">
              {!imageError ? (
                <div className="relative aspect-[4/3] max-h-[340px] w-full overflow-hidden rounded-[18px] bg-[#EEF0E8] sm:aspect-[3/4] sm:max-h-[540px] sm:rounded-[20px]">
                  <img
                    src={exhibitionPhoto}
                    alt="Gau Samvardhan — Smart Cattle Welfare & Monitoring System exhibition model and presenters"
                    onError={() => setImageError(true)}
                    loading="eager"
                    decoding="async"
                    className="h-full w-full object-cover object-top"
                  />
                </div>
              ) : (
                <div className="flex aspect-[4/3] w-full flex-col items-center justify-center rounded-[18px] border border-dashed border-[#A4B89B] bg-[#F8F8F3] p-8 text-center sm:rounded-[20px]">
                  <p className="font-editorial text-xl font-semibold text-[#174D36]">
                    Gau Samvardhan Exhibition Model
                  </p>
                  <p className="mt-2 max-w-xs text-sm text-[#5A655F]">
                    Place your exhibition photograph at{' '}
                    <code className="rounded bg-white px-1.5 py-0.5 text-xs">
                      src/assets/gau-samvardhan-exhibition.jpg
                    </code>
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Ultra-Short Single-Screen Feedback Section */}
        <section id="feedback-section" className="mx-auto mt-9 max-w-2xl scroll-mt-4 sm:mt-18 sm:scroll-mt-6">
          <div className="mb-4 text-center sm:mb-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#174D36] sm:text-xs">
              Visitor Feedback
            </p>
            <h2 className="font-editorial mt-1 text-2xl font-semibold tracking-tight text-[#1C2420] sm:mt-1.5 sm:text-3xl">
              Quick 15-Second Review
            </h2>
          </div>

          <FeedbackForm />
        </section>
      </main>
    </div>
  );
}
