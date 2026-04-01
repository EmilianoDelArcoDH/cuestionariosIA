'use client';

import { usePathname } from 'next/navigation';

export function AppHeader() {
  const pathname = usePathname();
  const hideHeader = pathname === '/questionnaire';

  if (hideHeader) {
    return null;
  }

  return (
    <header className="sticky top-0 z-20 border-b border-[rgba(82,55,30,0.08)] bg-[rgba(247,240,229,0.72)] backdrop-blur-xl">
      <div className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div>
          <p
            className="text-lg font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Cuestionarios IA
          </p>
          <p className="text-xs text-[var(--muted)]">
            Evaluacion con una interfaz mas clara y docente.
          </p>
        </div>
        <nav className="hidden items-center gap-2 text-sm md:flex">
          <a className="ghost-button" href="/">
            Inicio
          </a>
          <a className="ghost-button" href="/dashboard">
            Dashboard
          </a>
          <a className="ghost-button" href="/create">
            Crear
          </a>
          <a className="ghost-button" href="/student/demo">
            Demo
          </a>
        </nav>
      </div>
    </header>
  );
}
