import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
  darkMode?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndReload = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      localStorage.removeItem('ratool_auth_in_progress');
      sessionStorage.clear();
    } catch (e) {
      console.warn('Cache clear error:', e);
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const isDark = this.props.darkMode ?? true;
      return (
        <div
          className={`min-h-screen flex items-center justify-center p-4 ${
            isDark ? 'bg-neutral-950 text-white' : 'bg-gray-50 text-gray-900'
          }`}
        >
          <div
            className={`max-w-md w-full p-6 sm:p-8 rounded-2xl border shadow-xl text-center space-y-4 ${
              isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold">App Interruption Detected</h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                A temporary loading or caching mismatch occurred. You can easily reload to resume.
              </p>
            </div>

            {this.state.error?.message && (
              <div
                className={`p-2.5 rounded-lg text-left text-xs font-mono overflow-x-auto ${
                  isDark ? 'bg-black/40 text-gray-400' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <RefreshCw size={15} />
                Reload App
              </button>
              <button
                type="button"
                onClick={this.handleClearAndReload}
                className={`flex-1 py-2.5 px-4 rounded-xl border font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                  isDark
                    ? 'border-neutral-700 hover:bg-neutral-800 text-gray-300'
                    : 'border-gray-300 hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Trash2 size={15} />
                Reset Cache & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
