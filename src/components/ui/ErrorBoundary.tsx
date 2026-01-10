'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);

    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            <p>エラーが発生しました</p>
          </div>
          <p className="text-sm text-center opacity-90">
            表示中に問題が発生しました。
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleRetry}
            className="mt-2 bg-background hover:bg-accent"
          >
            再試行
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
