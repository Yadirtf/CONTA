# ADR-0011. Pertenecer a varias empresas: membresías con RLS, encabezado X-Empresa y transacción del usuario

- Estado: Aceptado (Inge, 2026-11-26)
- Fecha: 2026-11-26
- Historia: HU-04.02
- Decide: Inge

## Contexto

HU-04.02: «Como contador, quiero cambiar entre las empresas que llevo, para no tener varias cuentas». Criterio: dado un usuario con membresía en 3 empresas, cuando cambia de empresa, todos los datos mostrados son de la empresa elegida.

Es una decisión de nivel 3: cambia el modelo de seguridad multiempresa y es cara de revertir. Hay dos sub-decisiones:

- **A.** Cómo dice cada petición en qué empresa trabaja.
- **B.** Dónde vive la membresía y cómo se listan «mis empresas», si RLS no deja leer `conta.empresas` sin una empresa fijada.

Restricciones duras:

- [ADR-0006](0006-aislamiento-multiempresa-con-rls.md): RLS forzado, `conta_api` sin `BYPASSRLS`, contexto explícito, ni `SECURITY DEFINER` ni vistas sin `security_invoker`.
- Neon tiene el *pooler* en modo transacción.
- Identidad sin empresa ([ADR-0010](0010-acceso-con-celular-y-codigo-por-whatsapp.md)) y token opaco por dispositivo.
- La mantiene una sola persona, con capas gratuitas.

Solución obvia conocida: una tabla `membresias(usuario_id, empresa_id)` y el encabezado `X-Empresa` en cada petición.

## Alternativas consideradas (Verbalized Sampling)

Ronda completa y ronda de cola (k = 5). Las evaluó otro agente con los criterios de seguridad y de diseño de la [guía](../forma-de-trabajo/guia-del-coordinador.md#4-criterios-de-evaluación-por-dimensión). Un tercer agente hizo de atacante.

| # | Alternativa | Prob. verbalizada | Ronda | Puntaje (seg. / diseño / prom.) | Resultado |
| - | ----------- | ----------------- | ----- | ------------------------------- | --------- |
| 1 | Encabezado `X-Empresa` en cada petición; la membresía se comprueba en cada una | 0,35 | Completa | 4,00 / 4,85 / **4,43** | **Elegida (A)** |
| 2 | Empresa activa guardada en la sesión del servidor | 0,25 | Completa | 2,95 / 4,00 / 3,48 | Rechazada |
| 3 | Empresa en la ruta: `/empresas/:empresaId/...` | 0,18 | Completa | 4,20 / 3,80 / 4,00 | Segunda |
| 4 | Intercambio por un token de empresa corto | 0,12 | Completa | 3,65 / 2,80 / 3,23 | Rechazada |
| 5 | JWT con la lista de empresas en los *claims* | 0,10 | Completa | — | Descartada: no permite revocar al instante |
| 6 | Re-emitir el token al cambiar de empresa | 0,08 | Cola | 3,60 / 3,60 / 3,60 | Rechazada |
| 7 | La app descarta todo lo de la empresa anterior al cambiar | 0,06 | Cola | 4,15 / 3,75 / 3,95 | **Combinada (cliente)** |
| 8 | Pase HMAC por empresa | 0,05 | Cola | 2,75 / 2,95 / 2,85 | Rechazada |
| 9 | Un rol de base de datos por membresía | 0,04 | Cola | — | Descartada: ADR-0006 ya lo rechazó |
| 10 | Vista materializada para listar | 0,03 | Cola | — | Descartada: salta RLS |
| B1 | `conta.membresias` con RLS, más políticas de solo lectura para la «transacción del usuario» | 0,40 | Completa | 4,30 / 3,55 / **3,93** | **Elegida (B), con salvaguardas** |
| B2 | Membresías en `conta_identidad` con la razón social copiada | 0,30 | Completa | 3,15 / 3,90 / 3,53 | Rechazada |
| B3 | Ids en `conta_identidad` y una transacción por empresa para leer cada nombre | 0,15 | Completa | 3,75 / 3,70 / 3,73 | Rechazada |

Lo que decidió la evaluación:

- **2.** La consola web abre varias pestañas con el mismo token. Si en una se cambia de empresa, las otras escriben en otra empresa sin avisar. El atacante lo mostró con una factura emitida a la empresa equivocada, que no se puede borrar.
- **3.** Es igual de segura que la 1, pero obliga a cambiar todas las rutas. Lo que suma en auditoría se logra registrando `X-Empresa`.
- **B2.** Saca un dato de negocio de RLS y la copia se desactualiza.
- **B3.** Hace N viajes a la base para un contador con 40 empresas (HU-16.03).

### Contrapunto del atacante

| Ataque (prob. < 0,10) | Daño | Mitigación |
| --- | --- | --- |
| Las políticas permisivas se suman con OR: una transacción con usuario y empresa fijados vería todas las empresas del usuario | Las empresas del usuario | Las políticas del usuario exigen `empresa_actual() IS NULL`. `fijar_usuario()` y `fijar_empresa()` se excluyen en los dos órdenes. Hay prueba de integración y la prueba de catálogo revisa la forma de esas políticas |
| `app.usuario_id` queda pegado en una conexión del *pooler* | Cruza entre personas | `fijar_usuario()` solo hace `SET LOCAL` y aborta si ya había usuario. Hay prueba con un pool de una conexión |
| Carrera al cambiar de empresa con estado en el servidor | Un documento fiscal en la empresa equivocada | No hay estado: cada petición nombra su empresa (alternativa 1) |
| Membresía retirada con la sesión abierta | Una empresa | La membresía se comprueba en la base en cada petición, sin caché |
| Oráculo: distinguir «no existe» de «no eres miembro» | Metadatos | 404 uniforme para ajena, inexistente o mal escrita, por el mismo camino de código |

## Decisión

Se combinan la **1 (típica)**, la **B1 (típica, con salvaguardas)** y la **7 (cola, en el cliente)**:

- **`conta.membresias (empresa_id, usuario_id)`** es tabla de negocio: RLS forzado, llave que empieza por `empresa_id` y solo `SELECT, INSERT` para `conta_api`.
- **Cada petición dentro de una empresa manda `Authorization: Bearer` y `X-Empresa`.** `ResolutorPorMembresia` (módulo de empresas) valida la sesión y luego pregunta por la membresía dentro de una transacción de esa empresa, así que RLS filtra la membresía. Las respuestas son:
  - sin sesión: 401 (`acceso.sin-sesion`);
  - sin `X-Empresa`: 400 (`empresa.sin-elegir`);
  - empresa ajena, inexistente o mal escrita: 404 (`empresa.no-encontrada`).
- **Transacción del usuario.** `UnidadDeTrabajoDelUsuario` fija solo la persona con `conta_sistema.fijar_usuario()`. Las políticas `*_del_usuario_actual` (solo `FOR SELECT` y solo con `empresa_actual() IS NULL`) le dejan leer sus membresías y sus empresas. Nada más le muestra filas y no puede escribir.
- **`GET /empresas`** lista las empresas de la persona y **`POST /empresas`** crea una y hace miembro a quien la crea. El id lo genera el servidor, con un tope de 50 empresas por persona.
- **En la app,** la funcionalidad `empresas` lleva lo de adentro con la llave del id de la empresa. Al cambiar, Flutter descarta todo su estado, y la pantalla pide sus datos a la API dentro de la empresa elegida.

## Consecuencias

- Una membresía retirada deja de servir en la siguiente petición. HU-04.03 añade el rol a la misma fila y el resolutor lo devolverá en `ContextoEmpresa`.
- Cada petición de empresa hace dos consultas antes del caso de uso (sesión y membresía). Para 500 clientes basta. Si pesa, se unen en una sola consulta, sin caché por token.
- `POST /empresas` no es idempotente: si se reintenta, crea otra empresa. Se acepta mientras crear una empresa sea un paso manual y raro.
- Revertir a la alternativa 3 solo cambia el resolutor y las rutas. Revertir B1 exige otra migración que quite dos políticas y `fijar_usuario()`.
