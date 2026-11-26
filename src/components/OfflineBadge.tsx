import { useEffect, useState } from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';
import { syncPendingReviews } from '../services/reviewService';

export function OfflineBadge() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void syncPendingReviews();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-[#E2E5DC] bg-white/90 px-3.5 py-1.5 text-xs font-medium text-[#4A554F] shadow-xs"
      title={
        isOnline
          ? 'Application is cached for offline use'
          : 'No internet connection — reviews are safely saved locally'
      }
    >
      {isOnline ? (
        <>
          <CheckCircle2 className="h-3.5 w-3.5 text-[#174D36]" aria-hidden="true" />
          <span>Offline Ready</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3.5 w-3.5 text-[#C7A45B]" aria-hidden="true" />
          <span>Offline Ready · Local Mode</span>
        </>
      )}
    </div>
  );
}
