import { consultarSalud } from '../datos/consultar-salud';
import { mensajeDeEstado } from '../dominio/estado-api';

export async function EstadoDeLaApi() {
  const mensaje = mensajeDeEstado(await consultarSalud(process.env.NEXT_PUBLIC_API_URL));
  return (
    <p role="status" style={{ color: mensaje.nivel === 'ok' ? 'var(--ok)' : 'var(--alerta)' }}>
      {mensaje.texto}
    </p>
  );
}
