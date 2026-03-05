'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const isDevelopment = process.env.NODE_ENV === 'development';

  useEffect(() => {
    // Log the error to console in development
    console.error('Application Error:', error);

    // Log the error to Sentry in production
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          Something went wrong
        </h1>

        <p className="text-foreground-secondary mb-6">
          We've been notified and are working to fix the issue. Please try again.
        </p>

        {error.digest && (
          <p className="text-xs text-foreground-tertiary mb-4 font-mono">
            Error ID: {error.digest}
          </p>
        )}

        {/* Show error details in development */}
        {isDevelopment && (
          <div className="mb-6 text-left">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-sm text-foreground-secondary hover:text-foreground mx-auto mb-2"
            >
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showDetails ? 'Hide' : 'Show'} error details
            </button>

            {showDetails && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-left overflow-auto max-h-64">
                <p className="text-sm font-medium text-red-400 mb-2">
                  {error.name}: {error.message}
                </p>
                {error.stack && (
                  <pre className="text-xs text-red-300/80 whitespace-pre-wrap break-words">
                    {error.stack}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-background-secondary text-foreground rounded-lg hover:bg-background-tertiary transition-colors"
          >
            <Home className="w-4 h-4" />
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
