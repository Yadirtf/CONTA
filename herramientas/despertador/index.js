// Mantiene despierta la API de pruebas en Render durante el horario de pruebas.
// No toca la base de datos: /salud responde sin consultar Neon.
export default {
  async scheduled(_evento, env, ctx) {
    ctx.waitUntil(
      fetch(env.URL_SALUD, { headers: { "user-agent": "conta-despertador" } })
        .then((r) => console.log(`salud ${r.status}`))
        .catch((e) => console.log(`salud error: ${e.message}`))
    );
  },
};
