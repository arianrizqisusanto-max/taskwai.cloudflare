import React from "react";
import { AlertOctagon, RotateCw, Home } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error inside ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[50vh] bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-3xl shadow-sm max-w-lg mx-auto my-8">
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl mb-4">
            <AlertOctagon className="w-8 h-8 text-rose-600 dark:text-rose-455" />
          </div>
          <h3 className="text-lg font-black text-zinc-950 dark:text-white">
            Terjadi Kesalahan Halaman
          </h3>
          <p className="text-xs text-zinc-555 dark:text-zinc-400 mt-2.5 max-w-sm leading-relaxed font-semibold">
            Halaman ini gagal dimuat karena kesalahan kode internal. Modifikasi kode terbaru mungkin menyebabkan kegagalan sistem.
          </p>
          
          {this.state.error && (
            <div className="mt-4 p-3.5 bg-rose-50/30 dark:bg-rose-950/10 border border-rose-100/60 dark:border-rose-900/30 rounded-xl max-w-full overflow-x-auto text-left font-mono text-[10px] text-rose-600 dark:text-rose-400 w-full">
              <p className="font-bold">{this.state.error.name}: {this.state.error.message}</p>
              {this.state.error.stack && (
                <pre className="mt-2 text-[9px] opacity-80 leading-normal max-h-32 overflow-y-auto">
                  {this.state.error.stack}
                </pre>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 w-full">
            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm border-0"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Muat Ulang
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "/";
              }}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-zinc-150 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-zinc-750 dark:text-zinc-250 font-bold text-xs transition-colors cursor-pointer shadow-sm border-0"
            >
              <Home className="w-3.5 h-3.5" />
              Ke Beranda
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
