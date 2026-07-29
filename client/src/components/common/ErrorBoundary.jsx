// ErrorBoundary — catches render errors anywhere below it and shows a friendly
// fallback instead of a blank white screen. CONCEPT: only class components can be
// error boundaries in React, which is why this one isn't a function component.
import { Component } from 'react';
import Button from './Button.jsx';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  // React calls this when a child throws during render.
  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // In a real app this would go to a logging service; we keep one meaningful log.
    console.error('Unhandled UI error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-6 text-center dark:bg-gray-900">
          <h1 className="text-2xl font-bold text-brand-navy dark:text-white">Something went wrong</h1>
          <p className="max-w-md text-gray-600 dark:text-gray-300">
            An unexpected error occurred. Try reloading the page — your data is safe.
          </p>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
