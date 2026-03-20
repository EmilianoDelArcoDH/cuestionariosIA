import type { ReactNode } from 'react';
import { Manrope, Space_Grotesk } from 'next/font/google';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-body'
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display'
});

export const metadata = {
  title: 'Cuestionarios IA',
  description: 'Plataforma para evaluacion de cuestionarios educativos con IA y reglas.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body
        className={`${manrope.variable} ${spaceGrotesk.variable} min-h-screen`}
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <div className="app-shell min-h-screen flex flex-col">
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
          <main className="relative z-10 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
