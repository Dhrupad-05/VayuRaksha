import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

interface State {
  failed: boolean;
  message: string;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { failed: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("VayuRaksha UI failure", error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="fatal-error">
          <h1>VayuRaksha interface recovered from an error</h1>
          <p>{this.state.message}</p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}

