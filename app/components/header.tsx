import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';

export function Header() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-border-color bg-app-bg/80 backdrop-blur-sm">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-heading hover:text-subtitle transition-colors"
          >
            SRE Agent
          </Link>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Agent Active
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}

