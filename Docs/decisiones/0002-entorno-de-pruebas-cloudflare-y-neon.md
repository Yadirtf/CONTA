# ADR-0002. Entorno de pruebas en Cloudflare con Neon y carpetas api, web y app

- Estado: Propuesto (falta que Inge elija cómo corre la API)
- Fecha: 2026-11-23
- Historia: HU-01.06
- Decide: Inge

## Contexto
Inge definió que cada implementación se prueba en **Cloudflare**, con **Neon** como base de datos, y que el código va separado en `web/`, `api/` y `app/`, cada una con su propia lógica. El plan original proponía NestJS con Redis/BullMQ, S3 y KMS en una nube administrada. Hay que decidir cómo encaja cada pieza en Cloudflare sin romper la arquitectura limpia.

Restricciones duras: el dominio y la aplicación no dependen del proveedor; RLS por `empresa_id` debe seguir funcionando; los certificados nunca en texto plano; cada PR debe poder probarse aislado, con su propia base de datos.

Solución obvia conocida: meter NestJS en un contenedor y desplegarlo igual que en cualquier nube.

## Lo que ya está decidido (no se discute)

| Pieza | Dónde corre en pruebas |
| --- | --- |
| `app/` (Flutter web del cliente) | Cloudflare Pages: un despliegue por rama, URL `pr-<n>.conta-app.pages.dev` |
| `web/consola` y `web/sitio` (Next.js) | Cloudflare Workers con el adaptador OpenNext, versión de vista previa por PR |
| Base de datos | Neon: rama `develop` estable y una rama `preview/pr-<n>` por PR, creada desde `develop` y borrada al cerrar el PR |
| Archivos (XML, PDF) | Cloudflare R2 (compatible con S3, el puerto `AlmacenArchivos` no cambia) |
| Colas | Cloudflare Queues como adaptador del puerto de colas (reemplaza BullMQ en Cloudflare) |
| Secretos | Secretos de Workers; los certificados se cifran con una llave maestra (cifrado de sobre). El servicio de llaves de producción se decide en otro ADR |

## Alternativas consideradas para la API (Verbalized Sampling)

| # | Alternativa | Prob. verbalizada | Ronda | Puntaje ponderado |
| - | ----------- | ----------------- | ----- | ----------------- |
| 1 | NestJS sin cambios dentro de Cloudflare Containers | 0,40 | completa | 3,4 |
| 2 | API en Hono sobre Workers; dominio y aplicación en TypeScript puro; Neon con su driver serverless o Hyperdrive | 0,25 | completa | 4,2 |
| 3 | NestJS directo en Workers con `nodejs_compat` | 0,15 | completa | 2,0 |
| 4 | Hono en Workers para todo, y un Container pequeño solo para firmar XAdES y hablar SOAP con la DIAN si las librerías no corren en Workers | 0,08 | cola | 4,4 |
| 5 | API fuera de Cloudflare (Fly.io o Render) y Cloudflare solo para web y app | 0,06 | cola | 2,8 |

Criterios: los de «Diseño y arquitectura» de la [guía](../forma-de-trabajo/guia-del-coordinador.md#4-criterios-de-evaluación-por-dimensión). Las probabilidades son la estimación del modelo, no una medida.

**Por qué gana la 4.** Una vista previa por PR en Workers es inmediata y casi gratis; los Containers (disponibles de forma general desde abril de 2026) cobran por tiempo encendido y arrancan más lento. La arquitectura limpia hace que cambiar NestJS por Hono solo toque la capa de presentación y la composición: dominio y aplicación quedan iguales. El riesgo real es la firma XAdES y el SOAP de la DIAN en el entorno de Workers; la alternativa 4 lo aísla en un Container solo si hace falta, detrás del puerto `FirmadorDocumentos`.

**Descartes relevantes.** La 3 se descarta porque NestJS depende de `reflect-metadata` y de un arranque pesado que no encaja en Workers. La 5 contradice el pedido de probar todo en Cloudflare.

## Decisión propuesta
Alternativa 4. Si Inge prefiere conservar NestJS tal como dice el plan, se aplica la 1 y lo demás de este ADR no cambia.

## Consecuencias
- La carpeta `backend/` del plan pasa a llamarse `api/`.
- La regla de dependencia de CI prohíbe en `dominio/` y `aplicacion/` cualquier import de `hono`, `@nestjs/*`, `@cloudflare/*` o `@neondatabase/*`.
- Con Neon, la app se conecta con un rol sin `BYPASSRLS` que no es dueño de las tablas, y las tablas usan `FORCE ROW LEVEL SECURITY`; si no, el rol dueño se salta RLS.
- Con conexiones en pool, `app.empresa_id` se fija con `SET LOCAL` dentro de cada transacción.
- La prueba temprana de la firma XAdES (HU-02.02) debe correr dentro de Workers para confirmar si hace falta el Container.
