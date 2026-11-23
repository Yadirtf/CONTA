# Arquitectura limpia de CONTA

Este documento fija cómo se organiza el código de la plataforma. Parte del [plan del proyecto](../Plan%20del%20proyecto%20plataforma%20de%20facturación%20electrónica%20y%20contabilidad.md) y lo vuelve reglas concretas que cualquier persona o agente debe seguir. Si una regla de aquí choca con una prisa, gana la regla; si la regla está mal, se cambia con un ADR (ver [decisiones](../decisiones/README.md)), no se ignora.

## 1. Principios

1. **El dominio manda.** Las reglas del negocio (factura, CUFE, asiento contable, PUC, impuestos, caja) no saben nada de NestJS, PostgreSQL, Flutter, la DIAN ni Wompi.
2. **Las dependencias apuntan hacia adentro.** Presentación e infraestructura dependen de aplicación; aplicación depende de dominio; dominio no depende de nadie.
3. **Puertos y adaptadores.** Todo lo externo (DIAN, proveedor de respaldo, Wompi, KMS, S3, correo, WhatsApp, reloj, generador de ids) entra por una interfaz declarada en el dominio o la aplicación.
4. **Monolito modular primero.** Una sola API desplegable, dividido en módulos con fronteras claras. Se separa un módulo en servicio solo con un ADR que lo justifique con datos (carga, equipo, despliegue).
5. **Inmutabilidad fiscal y contable.** Documentos electrónicos y asientos no se editan ni se borran: se corrigen con notas y reversiones.
6. **Multiempresa por defecto.** Ningún caso de uso se ejecuta sin `empresaId` en su contexto; PostgreSQL lo refuerza con Row Level Security.
7. **Dinero exacto.** `numeric` en base de datos y un objeto de valor `Dinero` (centavos en enteros o decimal exacto) en código. Nunca `float`/`double`.

## 2. Las cuatro capas

| Capa | Qué contiene | Puede depender de | Nunca depende de |
| --- | --- | --- | --- |
| **Dominio** | Entidades, objetos de valor, agregados, eventos de dominio, reglas e invariantes, puertos de dominio | Nada (solo el lenguaje y utilidades puras) | Frameworks, ORM, HTTP, SDKs, otras capas |
| **Aplicación** | Casos de uso (comandos y consultas), DTO de entrada y salida, puertos de aplicación (repositorios, servicios externos), orquestación de transacciones | Dominio | Infraestructura, presentación, frameworks concretos |
| **Infraestructura** | Repositorios con PostgreSQL, adaptador DIAN directo, adaptador de proveedor de respaldo, Wompi, KMS, S3, colas BullMQ, correo | Aplicación y dominio (implementa sus puertos) | Presentación |
| **Presentación** | Controladores REST, validación de entrada, guardas de autenticación y rol, mapeo a OpenAPI, manejadores de webhooks y de colas | Aplicación | Infraestructura directamente (la recibe por inyección) |

La **composición** (qué adaptador implementa qué puerto) vive solo en el archivo de composición de cada módulo (`composicion.ts`, o `*.module.ts` si se usa NestJS), que es el único archivo que conoce todas las capas.

### Diagrama de dependencias

```
   presentacion  ──►  aplicacion  ──►  dominio
        │                 ▲               ▲
        │                 │ implementa    │ implementa
        └──(inyección)──  infraestructura ┘
```

## 3. Reglas de dependencia verificables

Estas reglas se comprueban en CI, no solo en la revisión:

| Regla | Cómo se verifica |
| --- | --- |
| `dominio/` no importa nada de `hono`, `@nestjs/*`, `@cloudflare/*`, `@neondatabase/*`, `typeorm`/`prisma`/`kysely`, `axios`, SDKs ni de `aplicacion/`, `infraestructura/`, `presentacion/` | `dependency-cruiser` (o `eslint-plugin-boundaries`) en `api/` |
| `aplicacion/` no importa de `infraestructura/` ni de `presentacion/` | Igual |
| Un módulo no importa el dominio interno de otro módulo; se comunica por su API pública (`index.ts` del módulo) o por eventos de dominio | Igual, con reglas por carpeta `modulos/*` |
| En Flutter, `dominio/` no importa `package:flutter`, `dio`, `drift` ni `riverpod` | `import_lint` / `custom_lint` en el análisis de Dart |
| En Flutter, una funcionalidad no importa `datos/` de otra funcionalidad | Igual |
| Ningún `float`/`double` para dinero | Regla de lint propia y pruebas de propiedad sobre `Dinero` |

Romper una regla hace fallar el pipeline. La excepción solo se permite con un ADR aprobado y queda anotada en el archivo de configuración con el número del ADR.

## 4. Estructura del repositorio

Monorepo con tres carpetas independientes. Cada una tiene su propio pipeline en `.github/workflows/`.

```
CONTA/
  Docs/                         # esta documentación
  app/                          # Flutter: Android, iPhone y web del cliente
  api/                          # API TypeScript + PostgreSQL (Neon); runtime según ADR-0002
  web/                          # Next.js: consola de administración y sitio público
  contratos/                    # openapi.yaml generado por la API; fuente de los clientes de API
  .github/workflows/            # ci-app.yml, ci-api.yml, ci-web.yml, vista-previa.yml, limpiar-artefactos.yml
  CLAUDE.md                     # instrucciones cortas para agentes; apunta a Docs/
```

### 4.1 API

El framework HTTP (Hono en Workers o NestJS en Containers) lo fija el [ADR-0002](../decisiones/0002-entorno-de-pruebas-cloudflare-y-neon.md). Solo afecta a `presentacion/` y al archivo de composición de cada módulo; dominio y aplicación no cambian.

```
api/
  src/
    compartido/                       # núcleo transversal, sin lógica de negocio
      dominio/                        # Dinero, Nit, Fecha fiscal, Resultado<T,E>, EventoDominio, ErrorDominio
      aplicacion/                     # UnidadDeTrabajo, Reloj, GeneradorId, ContextoEmpresa (puertos)
      infraestructura/                # Postgres/Neon (pool, RLS, migraciones), colas (Cloudflare Queues), llaves, R2, logger, Sentry
      presentacion/                   # filtros de error, guardas de rol y modo, interceptores de auditoría
    modulos/
      identidad/
      empresas/
      catalogo/
      facturacion/
        dominio/
          entidades/                  # DocumentoElectronico, LineaDocumento, Numeracion
          objetos-valor/              # Cufe, Prefijo, TipoDocumento, EstadoDian
          eventos/                    # DocumentoEmitido, DocumentoRechazado
          reglas/                     # cálculo de totales e impuestos por línea, transiciones de estado
          puertos/                    # ProveedorFacturacion, FirmadorDocumentos
        aplicacion/
          comandos/                   # EmitirFactura, EmitirNotaCredito, ReintentarEnvio
          consultas/                  # ListarDocumentos, ObtenerDocumento
          puertos/                    # RepositorioDocumentos, AlmacenArchivos, Notificador
        infraestructura/
          dian-directa/               # UBL 2.1, CUFE/CUDE, XAdES, cliente SOAP de la DIAN
          proveedor-respaldo/         # adaptador del proveedor externo (mismo puerto)
          persistencia/               # repositorios PostgreSQL y mapeadores
          colas/                      # trabajos de envío y reintento
        presentacion/
          http/                       # controladores y DTO de entrada validados
        composicion.ts                # composición: puerto → adaptador (facturacion.module.ts si es NestJS)
        index.ts                      # API pública del módulo para otros módulos
      caja/ inventario/ cartera/ contabilidad/ impuestos/
      habilitacion-dian/ suscripciones/ notificaciones/ auditoria/
  test/
    unitarias/                        # dominio y casos de uso, sin red ni base de datos
    integracion/                      # adaptadores contra PostgreSQL real (Testcontainers o rama de Neon)
    contrato/                         # ambiente de habilitación DIAN, sandbox de Wompi
    e2e/                              # API completa
```

### 4.2 App del cliente (Flutter)

```
app/
  lib/
    nucleo/                           # Dinero, errores, tema, i18n ("me deben" vs "cartera"), router
    sincronizacion/                   # cola local, resolución de conflictos, estado de conexión
    funcionalidades/
      facturacion/
        dominio/                      # entidades, casos de uso, contratos de repositorio
        datos/                        # cliente API generado de OpenAPI, tablas Drift, repositorios
        presentacion/
          simple/                     # pantallas del modo simple
          contador/                   # pantallas del modo contador
          estado/                     # providers Riverpod
      caja/ clientes/ productos/ inventario/ cartera/ gastos/ informes/
  test/                               # unitarias de dominio, widgets, golden tests
  integration_test/                   # flujos completos, incluido "vender sin internet"
```

El modo simple y el modo contador comparten dominio y datos; solo cambia la presentación. El modo es un permiso que llega del backend, no una bandera local.

### 4.3 Consola y sitio (Next.js)

```
web/
  consola/
    src/
      funcionalidades/
        empresas/ habilitacion/ certificados/ suscripciones/ soporte/ metricas/
          dominio/                    # tipos y reglas de presentación (estado de habilitación, alertas)
          datos/                      # cliente API generado de OpenAPI
          ui/                         # componentes y páginas
      compartido/                     # diseño, autenticación con 2FA, auditoría de "entrar como cliente"
  sitio/                              # página de venta, precios, registro y pago con Wompi
```

La consola no tiene lógica fiscal ni contable propia: todo pasa por la API.

## 5. Patrones obligatorios

| Situación | Patrón |
| --- | --- |
| Caso de uso que cambia estado | Comando → valida → carga agregado → aplica regla de dominio → guarda en una sola transacción → publica eventos (outbox) |
| Comunicación entre módulos | Eventos de dominio por **outbox transaccional** (p. ej. `DocumentoEmitido` → contabilidad genera el asiento). Nada de llamar al repositorio de otro módulo |
| Llamadas a la DIAN y a Wompi | Siempre en cola (puerto de colas; Cloudflare Queues en pruebas), idempotentes, con reintentos exponenciales y registro de cada intento |
| Webhooks de Wompi | Verificar firma, guardar el evento crudo, procesar en cola de forma idempotente por id de evento |
| Errores esperables | `Resultado<T, Error>` en dominio y aplicación; las excepciones quedan para fallas técnicas |
| Lecturas pesadas (informes) | Consultas dedicadas (lado de lectura) que pueden leer directo de vistas SQL; no cargan agregados |
| Multiempresa | `ContextoEmpresa` en cada caso de uso; la infraestructura fija `app.empresa_id` con `SET LOCAL` en cada transacción; la app usa un rol sin `BYPASSRLS` y las tablas tienen `FORCE ROW LEVEL SECURITY` |
| Auditoría | Interceptor de presentación + evento `AccionAuditada`; obligatorio al "entrar como cliente" |
| Secretos | Certificados cifrados con KMS; solo el adaptador `FirmadorDocumentos` los descifra en memoria |

## 6. Funcionamiento sin internet (app)

- La venta se registra en Drift con un id generado en el teléfono (UUID v7) y un número reservado de un bloque de consecutivos asignado por la API.
- La cola de `sincronizacion/` envía los documentos cuando vuelve la conexión; la API es idempotente por id de documento.
- Los conflictos se resuelven en la API: la app nunca decide el estado DIAN.
- La app muestra el estado de cada documento (pendiente, enviado, aceptado, rechazado) con palabras del modo activo.

## 7. Atributos de calidad y cómo se cuidan

| Atributo | Meta inicial | Mecanismo |
| --- | --- | --- |
| Seguridad | Cero fugas entre empresas; certificados nunca en texto plano | RLS + pruebas de aislamiento en CI, KMS, 2FA en consola y contador, auditoría |
| Corrección contable | Débitos = créditos en el 100% de los asientos | Invariante en el agregado `Asiento` + pruebas de propiedad |
| Disponibilidad de emisión | Vender aunque la DIAN o internet fallen | Cola, contingencia, adaptador de respaldo, modo sin internet |
| Rendimiento | Emitir una factura en menos de 2 s percibidos en gama baja | Respuesta optimista en la app, envío en segundo plano |
| Escalabilidad | 500 clientes sin cambiar arquitectura | Monolito modular, índices por `empresa_id`, colas, réplicas de lectura cuando haga falta |
| Mantenibilidad | Cambiar de proveedor DIAN sin tocar dominio | Puerto `ProveedorFacturacion` con dos adaptadores y pruebas de contrato comunes |
| Observabilidad | Saber del error antes que el cliente | Sentry, logs estructurados con `empresaId` y `documentoId`, alertas de cola atascada |

## 8. Pruebas por capa

| Capa | Tipo | Regla |
| --- | --- | --- |
| Dominio | Unitarias y de propiedad | Sin mocks de frameworks; cubren cada regla fiscal y contable. Cobertura de ramas ≥ 90% |
| Aplicación | Unitarias con dobles de los puertos | Un caso feliz y los errores esperables por caso de uso |
| Infraestructura | Integración (Testcontainers) y contrato | El mismo conjunto de contrato corre contra el adaptador DIAN directo y el de respaldo |
| Presentación | E2E de API | Autorización por rol y modo, aislamiento entre empresas |
| App | Widget, golden y de integración | Flujo "factura en 3 toques" y "vender sin internet" siempre verdes |

## 9. Despliegue de pruebas

Cada PR se prueba en Cloudflare con su propia rama de Neon. Detalle en [entorno de pruebas](../despliegue/entorno-de-pruebas.md) y [ADR-0002](../decisiones/0002-entorno-de-pruebas-cloudflare-y-neon.md).

## 10. Decisiones abiertas

Se resuelven con el proceso de alternativas de la [guía de trabajo](../forma-de-trabajo/guia-del-coordinador.md) y quedan como ADR:

- ORM o constructor de consultas en la API (Prisma, TypeORM, Kysely, Drizzle).
- Librería de firma XAdES en Node o implementación propia.
- Proveedor de nube administrada y de KMS.
- Estrategia de reserva de consecutivos para facturar sin internet.
- Flutter frente a React Native con Expo (el plan recomienda Flutter; confirmar con un ADR antes de escribir la app).
