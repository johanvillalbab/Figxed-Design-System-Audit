import React, { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[Figxed] UI Error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: 'color-mix(in srgb, var(--figma-color-bg-danger) 10%, var(--figma-color-bg))',
            }}
          >
            <AlertTriangle size={24} className="text-figma-danger" />
          </div>
          <h2 className="text-sm font-semibold text-figma-text mb-1">Something went wrong</h2>
          <p className="text-xs text-figma-text-secondary mb-5 max-w-[260px] leading-relaxed">
            {this.state.error?.message || 'An unexpected error occurred in the plugin UI.'}
          </p>
          <button
            className="btn-primary flex items-center gap-1.5"
            onClick={this.handleReload}
          >
            <RotateCcw size={13} />
            Reload Plugin
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
