// Elige la cadena de conexión a Neon según dónde corre la API.
// En una vista previa de Render (IS_PULL_REQUEST=true) se usa la rama "preview" de Neon,
// para no escribir en la base de develop. Ver Docs/despliegue/entorno-de-pruebas.md.
export type VariablesDeEntorno = Readonly<Record<string, string | undefined>>;

export function urlBaseDeDatos(env: VariablesDeEntorno = process.env): string | undefined {
  const esVistaPrevia = env['IS_PULL_REQUEST'] === 'true';
  const url = esVistaPrevia ? env['DATABASE_URL_PREVIEW'] : env['DATABASE_URL'];
  return url && url.trim() !== '' ? url : undefined;
}
