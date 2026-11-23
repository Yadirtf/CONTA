import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CONTA',
  description: 'Facturación electrónica y contabilidad para negocios en Colombia',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es-CO">
      <body>{children}</body>
    </html>
  );
}
