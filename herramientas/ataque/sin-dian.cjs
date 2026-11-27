// Se carga antes de la API local de ataque (node -r): ninguna petición sale hacia la DIAN. La prueba de ataque
// nunca toca servicios de terceros; el envío queda en su cola y falla aquí, con su intento registrado.
const fetchOriginal = globalThis.fetch;
globalThis.fetch = (recurso, opciones) => {
  const url = String(recurso instanceof Request ? recurso.url : recurso);
  if (/^https?:\/\/[^/]*dian\.gov\.co/i.test(url)) return Promise.reject(new Error('DIAN bloqueada en el entorno de ataque'));
  return fetchOriginal(recurso, opciones);
};
