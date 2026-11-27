// Deja lista una empresa para facturar (HU-06.01) mientras llega el asistente de habilitación (EP-07):
// guarda sus datos fiscales y agrega su resolución de numeración. Corre como conta_app (dueño de las tablas),
// nunca como conta_api, que solo puede leer estos datos.
//
// Uso: DATABASE_URL=postgres://conta_app:...  node scripts/configurar-facturacion.mjs <archivo.json>
// El archivo vive fuera del repositorio (lleva el NIT y la dirección del facturador). Su forma:
// {
//   "empresaId": "uuid", "nit": "900373076", "razonSocial": "...", "tipoDePersona": "juridica",
//   "responsabilidadesFiscales": ["O-13"], "responsableDeIva": true,
//   "direccion": { "codigoMunicipio": "11001", "ciudad": "Bogotá, D.C.", "departamento": "Bogotá", "linea": "Calle 1 # 2-3" },
//   "correo": "facturas@ejemplo.com",
//   "resolucion": { "id": "uuid", "numero": "18760000001", "prefijo": "SETP", "desde": 990000000, "hasta": 995000000,
//                   "vigenteDesde": "2019-01-19", "vigenteHasta": "2030-01-19", "siguiente": 990000001 }
// }
// HU-06.02: en vez de "resolucion" puede ir "resoluciones": [ ... ], cada una con "clase": "factura" (por omisión)
// o "pos" para el tiquete POS electrónico, que la DIAN autoriza con su propia resolución y prefijo.
// Repetirlo actualiza los datos fiscales. Una resolución ya guardada no se cambia nunca (sus números pueden estar
// en facturas): para otro rango se agrega una resolución nueva con otro id.
import { readFileSync } from 'node:fs';
import pg from 'pg';

const [archivo] = process.argv.slice(2);
const url = process.env.DATABASE_URL;
if (!archivo || !url) {
  console.error('Uso: DATABASE_URL=... node scripts/configurar-facturacion.mjs <archivo.json>');
  process.exit(1);
}

const d = JSON.parse(readFileSync(archivo, 'utf8'));
const resoluciones = d.resoluciones ?? [d.resolucion];
const CLASES = ['factura', 'pos'];
for (const r of resoluciones) {
  if (!CLASES.includes(r.clase ?? 'factura')) {
    console.error(`Clase de resolución inválida: usa ${CLASES.join(' o ')}.`);
    process.exit(1);
  }
}
const cliente = new pg.Client({ connectionString: url });
await cliente.connect();
try {
  await cliente.query('begin');
  await cliente.query(
    `insert into conta.datos_fiscales (empresa_id, nit, razon_social, tipo_de_persona, responsabilidades_fiscales,
       responsable_de_iva, codigo_municipio, ciudad, departamento, direccion, correo)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     on conflict (empresa_id) do update set nit = excluded.nit, razon_social = excluded.razon_social,
       tipo_de_persona = excluded.tipo_de_persona, responsabilidades_fiscales = excluded.responsabilidades_fiscales,
       responsable_de_iva = excluded.responsable_de_iva, codigo_municipio = excluded.codigo_municipio,
       ciudad = excluded.ciudad, departamento = excluded.departamento, direccion = excluded.direccion, correo = excluded.correo`,
    [d.empresaId, d.nit, d.razonSocial, d.tipoDePersona, d.responsabilidadesFiscales, d.responsableDeIva,
      d.direccion.codigoMunicipio, d.direccion.ciudad, d.direccion.departamento, d.direccion.linea, d.correo ?? null],
  );
  const resultados = [];
  for (const r of resoluciones) {
    const { rowCount } = await cliente.query(
      `insert into conta.resoluciones_de_numeracion (empresa_id, id, numero, prefijo, desde, hasta, vigente_desde, vigente_hasta, siguiente, clase)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) on conflict do nothing`,
      [d.empresaId, r.id, r.numero, r.prefijo, r.desde, r.hasta, r.vigenteDesde, r.vigenteHasta, r.siguiente ?? r.desde, r.clase ?? 'factura'],
    );
    resultados.push(`${r.prefijo} (${r.clase ?? 'factura'}) ${rowCount === 1 ? 'agregada' : 'ya existía (sin cambios)'}`);
  }
  await cliente.query('commit');
  console.log(`Datos fiscales guardados. Resoluciones: ${resultados.join('; ')}.`);
} catch (error) {
  await cliente.query('rollback');
  // Solo el mensaje de PostgreSQL: la cadena de conexión nunca se imprime.
  console.error(`No se pudo configurar: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await cliente.end();
}
