import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-8 text-center font-sans">
                    <div className="text-6xl mb-4">💥</div>
                    <h1 className="text-3xl font-bold text-red-800 mb-4">Something went wrong.</h1>
                    <p className="text-red-600 mb-8 max-w-md">
                        The application encountered a critical error. Please share the details below with support.
                    </p>
                    <div className="bg-white p-6 rounded-xl border border-red-200 shadow-sm text-left overflow-auto max-w-2xl w-full max-h-96">
                        <p className="font-bold text-red-700 mb-2">{this.state.error && this.state.error.toString()}</p>
                        <pre className="text-xs text-gray-500 font-mono whitespace-pre-wrap">
                            {this.state.errorInfo?.componentStack || "No stack trace available"}
                        </pre>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-8 px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition"
                    >
                        Reload Application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
