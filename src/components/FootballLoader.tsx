import React from 'react';

interface FootballLoaderProps {
  title?: string;
  step?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const FootballLoader: React.FC<FootballLoaderProps> = ({
  title = 'جاري التحميل...',
  step,
  subtitle,
  size = 'md',
}) => {
  const iconSize = size === 'sm' ? 'w-10 h-10 text-xl' : size === 'lg' ? 'w-20 h-20 text-4xl' : 'w-16 h-16 text-3xl';

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center select-none" dir="rtl">
      {/* Animated Football Orb */}
      <div className="relative flex items-center justify-center mb-5">
        {/* Outer Pulsing Tactical Radar Ring */}
        <div className="absolute inset-0 -m-3 rounded-full border border-[#22C55E]/30 bg-[#22C55E]/5 animate-ping opacity-30 pointer-events-none" />

        {/* Orbiting Tactical Dot */}
        <div className="absolute inset-0 -m-2 animate-spin pointer-events-none" style={{ animationDuration: '3s' }}>
          <div className="w-2.5 h-2.5 rounded-full bg-[#22C55E] shadow-sm shadow-[#22C55E]" />
        </div>

        {/* Center Football Ball */}
        <div
          className={`${iconSize} rounded-2xl bg-[#171E1A] border-2 border-[#22C55E]/40 flex items-center justify-center shadow-lg shadow-[#22C55E]/15 relative z-10 transition-transform duration-300`}
        >
          <span className="drop-shadow-sm inline-block animate-pulse">⚽</span>
        </div>
      </div>

      {/* Main Title */}
      <h3 className="text-base sm:text-lg font-black text-[#EEF2EF] mb-1 tracking-tight">
        {title}
      </h3>

      {/* Subtitle / Description */}
      {subtitle && (
        <p className="text-xs text-[#8FA095] max-w-xs mx-auto leading-relaxed mb-3">
          {subtitle}
        </p>
      )}

      {/* Active Step Pill */}
      {step && (
        <div
          key={step}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#131815] border border-[#212823] text-xs font-bold text-[#22C55E] transition-all"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-ping" />
          <span>{step}</span>
        </div>
      )}
    </div>
  );
};
