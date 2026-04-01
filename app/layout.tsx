import type { ReactNode } from 'react';
import { Manrope, Space_Grotesk } from 'next/font/google';
import { AppHeader } from '@/components/app-header';
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
          <AppHeader />
          <main className="relative z-10 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
