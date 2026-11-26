import { Component, StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#F8F8F3] p-6 text-[#1C2420]">
          <div className="mx-auto max-w-lg rounded-2xl border border-[#E5B8B0] bg-white p-6">
            <h1 className="text-lg font-semibold text-[#9B3324]">Unable to load page</h1>
            <p className="mt-2 text-sm text-[#4E5953]">{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-full bg-[#174D36] px-5 py-2 text-sm font-semibold text-white"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Service worker registration failure should not block the app
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>
);
