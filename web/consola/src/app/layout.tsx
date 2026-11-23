import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CONTA · Consola',
  description: 'Consola de administración de CONTA',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es-CO">
      <body>{children}</body>
    </html>
  );
}
