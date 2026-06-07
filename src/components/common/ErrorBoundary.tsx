import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 错误边界组件 - 捕获子组件渲染错误，防止整个应用崩溃
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-foreground">出了点问题</h2>
            <p className="text-muted-foreground mb-6">
              页面遇到了一个错误。请尝试刷新页面或点击下方按钮重试。
            </p>
            <pre className="text-xs text-muted-foreground bg-muted p-4 rounded-lg mb-6 overflow-auto max-h-32">
              {this.state.error?.message || '未知错误'}
            </pre>
            <button
              onClick={this.handleRetry}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
