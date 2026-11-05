import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCcw, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled render error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetAll = () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('guess_the_player_game_state_v2');
        localStorage.removeItem('guess_the_player_game_state_v3');
      }
    } catch (e) {
      console.warn('Failed to clear storage in ErrorBoundary:', e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-screen bg-[#0B0D0C] text-[#EEF2EF] flex items-center justify-center p-4 select-none font-sans"
        >
          <div className="w-full max-w-md bg-[#131815] border border-[#212823] rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-3xl mx-auto shadow-inner">
              😅
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#EEF2EF] mb-2 tracking-tight">
                حصلت مشكلة غير متوقعة 😅
              </h2>
              <p className="text-xs sm:text-sm text-[#8FA095] leading-relaxed">
                متشغلش بالك، تقدر تكمل اللعبة أو تبدأ من جديد لو حابب.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-3.5 px-4 rounded-xl bg-[#22C55E] hover:bg-[#1FA644] active:bg-[#1A8D3A] text-[#0B0D0C] font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-[#22C55E]/15"
              >
                <RefreshCw className="w-4 h-4" />
                <span>كمّل اللعبة</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetAll}
                className="flex-1 py-3.5 px-4 rounded-xl bg-[#171E1A] hover:bg-[#1C2520] active:bg-[#131815] text-[#EEF2EF] font-bold text-xs sm:text-sm border border-[#212823] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-[#8FA095]" />
                <span>ابدأ من جديد</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
