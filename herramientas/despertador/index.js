// Mantiene despierta la API de pruebas en Render durante el horario de pruebas y, de paso, le pide
// procesar los trabajos vencidos de la cola (envíos a la DIAN, ADR-0008).
// /salud no consulta Neon; /interno/trabajos/procesar solo la consulta si hay token configurado.
const AGENTE = { "user-agent": "conta-despertador" };

function despertar(env) {
  return fetch(env.URL_SALUD, { headers: AGENTE })
    .then((r) => console.log(`salud ${r.status}`))
    .catch((e) => console.log(`salud error: ${e.message}`));
}

function procesarTrabajos(env) {
  if (!env.TOKEN_TRABAJOS) return Promise.resolve();
  return fetch(env.URL_TRABAJOS, { method: "POST", headers: { ...AGENTE, authorization: `Bearer ${env.TOKEN_TRABAJOS}` } })
    .then((r) => console.log(`trabajos ${r.status}`))
    .catch((e) => console.log(`trabajos error: ${e.message}`));
}

export default {
  async scheduled(_evento, env, ctx) {
    ctx.waitUntil(despertar(env).then(() => procesarTrabajos(env)));
  },
};
