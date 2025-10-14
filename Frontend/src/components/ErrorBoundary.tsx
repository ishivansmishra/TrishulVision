import React from 'react';

type Props = { children: React.ReactNode; fallback?: React.ReactNode };
type State = { hasError: boolean; message?: string };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, message: String(error?.message || error) };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: undefined });
    try { window.location.reload(); } catch {}
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="container mx-auto px-4 py-10">
          <div className="border border-border rounded-lg p-6 bg-card">
            <h2 className="text-xl font-semibold mb-2">We hit a temporary issue</h2>
            {this.state.message && (
              <p className="text-sm text-muted-foreground mb-4">{this.state.message}</p>
            )}
            <div className="mb-4 text-sm text-muted-foreground">
              <p className="font-medium mb-1">What the integration does</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Connects the frontend to backend services for AI mining detection, GIS, and 3D terrain.</li>
                <li>Fetches satellite/DEM layers, boundaries, and model outputs to render maps and analytics.</li>
                <li>Streams alerts and IoT/drone updates when available.</li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={this.handleRetry} className="px-4 py-2 rounded-md bg-primary text-primary-foreground">Reload page</button>
              <a href="/" className="px-4 py-2 rounded-md border border-border">Go to home</a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}

export default ErrorBoundary;
