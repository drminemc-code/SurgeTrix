import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('SurgeTrix ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{ backgroundColor: 'var(--st-bg)', color: 'var(--st-text)' }}
        >
          <div className="max-w-md w-full st-card p-6 space-y-4">
            <h1 className="text-xl font-bold">Something went wrong</h1>
            <p className="text-xs font-mono break-words" style={{ color: 'var(--st-text-muted)' }}>
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 st-btn-primary text-sm font-semibold cursor-pointer"
            >
              Reload SurgeTrix
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
