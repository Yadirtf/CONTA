// Imprime la cadena de conexión de DATABASE_URL cambiando el usuario y la contraseña por los del rol de la API.
// La usa CI: la acción de Neon entrega la cadena del rol dueño (conta_app, que corre las migraciones y tiene
// BYPASSRLS en Neon) y la API debe conectarse con conta_api, creado por SQL sin BYPASSRLS (HU-01.06).
// Uso: DATABASE_URL=... ROL_API=conta_api ROL_API_CLAVE=... node scripts/url-con-rol.mjs
// Nunca imprime nada más que la cadena; quien la usa la guarda en una variable, no en el log.
const { DATABASE_URL: base, ROL_API: rol, ROL_API_CLAVE: clave } = process.env;
const falta = ['DATABASE_URL', 'ROL_API', 'ROL_API_CLAVE'].filter((n) => !process.env[n]);
if (falta.length) {
  console.error(`Falta ${falta.join(', ')}: no se puede armar la conexión del rol de la API.`);
  process.exit(1);
}
let url;
try {
  url = new URL(base);
} catch {
  console.error('DATABASE_URL no es una URL válida.');
  process.exit(1);
}
url.username = encodeURIComponent(rol);
url.password = encodeURIComponent(clave);
process.stdout.write(url.toString());
