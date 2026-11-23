import { Suspense } from 'react';
import { EstadoDeLaApi } from '@/funcionalidades/salud/ui/estado-de-la-api';

// Se renderiza en cada visita para mostrar el estado real de la API.
export const dynamic = 'force-dynamic';

export default function Inicio() {
  return (
    <main>
      <h1>CONTA · Consola</h1>
      <p style={{ color: 'var(--suave)' }}>Entorno de pruebas. Solo datos de prueba.</p>
      <Suspense fallback={<p role="status">Consultando la API…</p>}>
        <EstadoDeLaApi />
      </Suspense>
    </main>
  );
}
