import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./ui/Button";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-bg text-text p-6">
          <div className="max-w-md bg-surface p-8 rounded-xl border border-danger/30 shadow-md text-center flex flex-col items-center">
            <AlertCircle className="mb-4 h-12 w-12 text-danger" />
            <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
            <p className="text-text-secondary mb-6 text-sm">
              An unexpected error occurred in the application. Our team has been notified.
            </p>
            <Button onClick={() => window.location.reload()} className="w-full">
              <RefreshCw size={16} className="mr-2" /> Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
