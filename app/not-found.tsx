import Link from 'next/link';
import { ROUTES } from '@/lib/shell/routes';
import { SHELL_COPY } from '@/lib/copy/shell';

export default function NotFound() {
  const c = SHELL_COPY.notFound;
  return (
    <div className="shell-page shell-page--utility">
      <div className="shell-card shell-card--utility shell-card--centered">
        <h1 className="shell-title shell-title--compact">{c.title}</h1>
        <p className="shell-prose">{c.subtitle}</p>
        <Link href={ROUTES.home} className="neon-btn neon-btn-primary shell-block-link">
          {c.cta}
        </Link>
      </div>
    </div>
  );
}
