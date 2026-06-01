import { SHELL_COPY } from '@/lib/copy/shell';

type PremiumLoaderProps = {
  title?: string;
  subtitle?: string;
  compact?: boolean;
};

/** Polished full-screen loader for route transitions. */
export function PremiumLoader({
  title = SHELL_COPY.loading.title,
  subtitle = SHELL_COPY.loading.subtitle,
  compact = false,
}: PremiumLoaderProps) {
  return (
    <div
      className={`premium-loader${compact ? ' premium-loader--compact' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="premium-loader__bg" aria-hidden />
      <div className="premium-loader__glow premium-loader__glow--teal" aria-hidden />
      <div className="premium-loader__glow premium-loader__glow--magenta" aria-hidden />
      <div className="premium-loader__inner">
        <div className="premium-loader__ring" aria-hidden />
        <p className="premium-loader__title">{title}</p>
        <p className="premium-loader__sub">{subtitle}</p>
      </div>
    </div>
  );
}
