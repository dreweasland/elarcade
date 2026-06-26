import { Component, ReactNode } from 'react';

/**
 * Contains render-time crashes so one misbehaving board can't white-screen the
 * whole app. Shows a friendly reload panel; the app chrome stays put.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    console.error('UI render error:', error);
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <div className="error-screen">
          <p className="error-screen-msg">Something glitched.</p>
          <button className="btn primary" onClick={() => location.reload()}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
