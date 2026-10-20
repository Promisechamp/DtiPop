// src/components/ErrorBoundary.jsx

import React from 'react';
import { AlertTriangle, RefreshCw, Home, Code2 } from 'lucide-react';

/**
 * Advanced ErrorBoundary – catches all JavaScript errors anywhere in the app,
 * including async code, promise rejections, and event handlers.
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
    this.handleGlobalError = this.handleGlobalError.bind(this);
    this.handleGlobalRejection = this.handleGlobalRejection.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 ErrorBoundary (React) caught:', error, errorInfo);
    this.setState({
      errorInfo,
      componentStack: errorInfo?.componentStack || null,
    });
    this.reportError(error, errorInfo);
  }

  componentDidMount() {
    window.addEventListener('error', this.handleGlobalError);
    window.addEventListener('unhandledrejection', this.handleGlobalRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('unhandledrejection', this.handleGlobalRejection);
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }

  handleGlobalError(event) {
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

    event.preventDefault();
    this.reportError(error || message);
  }

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

  reportError(error, errorInfo) {
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (reportingError) {
        console.warn('Error reporting failed:', reportingError);
      }
    }
  }

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
    const { hasError, error } = this.state;

    if (hasError) {
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
    const { componentStack, resetCooldown } = this.state;

    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50/30 px-5 py-12">
        <div className="w-full max-w-md">
          <div className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
            {/* HEADER */}
            <div className="border-b border-ink-100 px-5 py-6 text-center sm:px-6">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-50 text-danger-600">
                <AlertTriangle size={24} />
              </div>

              <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-danger-600">
                Something went wrong
              </p>

              <h1 className="text-2xl font-black tracking-tight text-ink-950">
                An unexpected error occurred
              </h1>

              <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-ink-500">
                {errorMessage}
              </p>
            </div>

            {/* DEV STACK */}
            {isDev && (errorStack || componentStack) && (
              <div className="border-b border-ink-100 px-5 py-4 sm:px-6">
                <details className="group rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
                  <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-extrabold text-ink-500 transition hover:text-ink-800">
                    <Code2 size={12} />
                    Error details (developer)
                  </summary>

                  {errorStack && (
                    <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-ink-100 bg-white p-2.5 text-[11px] font-mono text-ink-600">
                      {errorStack}
                    </pre>
                  )}

                  {componentStack && (
                    <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-ink-100 bg-white p-2.5 text-[10px] font-mono text-ink-400">
                      {componentStack}
                    </pre>
                  )}
                </details>
              </div>
            )}

            {/* ACTIONS */}
            <div className="px-5 py-5 sm:px-6">
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => (window.location.href = '/')}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
                >
                  <Home size={15} />
                  Go home
                </button>

                <button
                  type="button"
                  onClick={this.handleReset}
                  disabled={resetCooldown}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    size={15}
                    className={resetCooldown ? 'animate-spin' : undefined}
                  />
                  {resetCooldown ? 'Please wait…' : 'Try again'}
                </button>
              </div>

              <p className="mt-5 text-center text-[11px] font-medium leading-5 text-ink-400">
                Still stuck?{' '}
                <a
                  href="/support"
                  className="font-extrabold text-primary-600 transition hover:text-primary-700 hover:underline"
                >
                  Contact support
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;