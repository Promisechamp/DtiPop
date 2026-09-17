import React from 'react';

/**
 * Advanced ErrorBoundary – catches all JavaScript errors anywhere in the app,
 * including async code, promise rejections, and event handlers.
 *
 * Features:
 * - Catches render/child-component errors (componentDidCatch)
 * - Catches unhandled exceptions (window.onerror)
 * - Catches unhandled promise rejections (unhandledrejection)
 * - Prevents duplicate error states
 * - Cleanup of global listeners on unmount
 * - Shows detailed stack in development
 * - Custom fallback support
 * - Reset cooldown to avoid rapid loops
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      componentStack: null,
      resetCooldown: false,
    };
    this.resetTimer = null;
    // Bound method for global error handlers
    this.handleGlobalError = this.handleGlobalError.bind(this);
    this.handleGlobalRejection = this.handleGlobalRejection.bind(this);
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log and capture error info
    console.error('🚨 ErrorBoundary (React) caught:', error, errorInfo);
    this.setState({
      errorInfo,
      componentStack: errorInfo?.componentStack || null,
    });
    this.reportError(error, errorInfo);
  }

  componentDidMount() {
    // Attach global error listeners to catch errors outside React lifecycle
    window.addEventListener('error', this.handleGlobalError);
    window.addEventListener('unhandledrejection', this.handleGlobalRejection);
  }

  componentWillUnmount() {
    // Clean up listeners and timers
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('unhandledrejection', this.handleGlobalRejection);
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }

  // ─── Global error handler for runtime exceptions ──────────
  handleGlobalError(event) {
    // Ignore errors that are already being handled by React's boundary
    if (this.state.hasError) return;

    const { error, message, filename, lineno, colno } = event;
    console.warn('🌍 Global error caught:', error || message);

    this.setState({
      hasError: true,
      error: error || new Error(message || 'Unknown runtime error'),
      errorInfo: {
        componentStack: `at ${filename || 'unknown'}:${lineno || '?'}:${colno || '?'}`,
      },
    });

    // Prevent default browser error logging
    event.preventDefault();
    this.reportError(error || message);
  }

  // ─── Global handler for unhandled promise rejections ─────
  handleGlobalRejection(event) {
    if (this.state.hasError) return;

    const { reason } = event;
    console.warn('🌍 Unhandled promise rejection:', reason);

    this.setState({
      hasError: true,
      error: reason instanceof Error ? reason : new Error(String(reason)),
      errorInfo: {
        componentStack: 'Unhandled Promise Rejection',
      },
    });

    event.preventDefault();
    this.reportError(reason);
  }

  // ─── Error reporting (optional) ───────────────────────────
  reportError(error, errorInfo) {
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (reportingError) {
        console.warn('Error reporting failed:', reportingError);
      }
    }
  }

  // ─── Reset handler ──────────────────────────────────────────
  handleReset = () => {
    if (this.state.resetCooldown) return;
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      componentStack: null,
      resetCooldown: true,
    });
    this.resetTimer = setTimeout(() => {
      this.setState({ resetCooldown: false });
      this.resetTimer = null;
    }, 500);
  };

  render() {
    const { hasError, error, errorInfo, componentStack } = this.state;

    if (hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        try {
          return this.props.fallback(error, this.handleReset);
        } catch (fallbackError) {
          console.error('ErrorBoundary fallback threw:', fallbackError);
          return this.renderDefaultFallback(error);
        }
      }
      return this.renderDefaultFallback(error);
    }

    return this.props.children;
  }

  renderDefaultFallback(error) {
    const isDev = process.env.NODE_ENV === 'development';
    const errorMessage = error?.message || 'An unexpected error occurred.';
    const errorStack = error?.stack || null;

    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50/30 px-4">
        <div className="max-w-md w-full bg-white border border-ink-100/80 rounded-2xl shadow-sm p-8 text-center">
          {/* Icon */}
          <div className="inline-flex w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200/60 items-center justify-center text-rose-600 mb-5 shadow-sm">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h1 className="text-xl font-extrabold text-ink-900 mb-2">
            Something went wrong
          </h1>

          <p className="text-sm font-medium text-ink-500 mb-6">
            {errorMessage}
          </p>

          {/* Show stack trace in development */}
          {isDev && errorStack && (
            <details className="mb-6 text-left bg-ink-50/50 rounded-xl p-4 border border-ink-100/60 max-h-48 overflow-auto">
              <summary className="text-xs font-bold text-ink-500 cursor-pointer hover:text-ink-700">
                <svg className="inline mr-1 w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Error details (developer)
              </summary>
              <pre className="mt-3 text-[11px] font-mono text-ink-600 whitespace-pre-wrap break-words">
                {errorStack}
              </pre>
              {this.state.componentStack && (
                <pre className="mt-2 text-[10px] font-mono text-ink-400 whitespace-pre-wrap break-words border-t border-ink-100/60 pt-2">
                  {this.state.componentStack}
                </pre>
              )}
            </details>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={this.handleReset}
              disabled={this.state.resetCooldown}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white text-sm font-extrabold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 9a8 8 0 0112-6m0 12a8 8 0 01-12 6" />
              </svg>
              {this.state.resetCooldown ? 'Please wait...' : 'Try again'}
            </button>

            <button
              onClick={() => (window.location.href = '/')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-ink-200 bg-white hover:bg-ink-50 text-ink-700 text-sm font-bold transition shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Go home
            </button>
          </div>

          <p className="mt-6 text-xs font-medium text-ink-400">
            Need help?{' '}
            <a
              href="/support"
              className="text-primary-600 hover:text-primary-700 font-bold transition"
            >
              Contact support
            </a>
          </p>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;