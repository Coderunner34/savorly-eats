import { Component, type ErrorInfo, type ReactNode } from "react";

export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Savorly rendering error", error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="error-boundary">
          <strong>Savorly.</strong>
          <h1>Something did not load correctly.</h1>
          <p>Your saved cart is still available. Refresh this page, or contact us directly on WhatsApp.</p>
          <div>
            <button onClick={() => window.location.reload()}>Refresh page</button>
            <a href="https://wa.me/254792211741">Open WhatsApp</a>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
