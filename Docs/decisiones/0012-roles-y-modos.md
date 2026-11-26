# ADR-0012. Roles y modos: matriz de permisos en el dominio, comprobada en la guarda y otra vez en el caso de uso

- Estado: Aceptado (Inge, 2026-11-26)
- Fecha: 2026-11-26
- Historia: HU-04.03
- Decide: Inge

## Contexto

HU-04.03: «Como dueño, quiero invitar a mi cajero con permisos limitados, para que venda sin ver los informes». Criterios:

- Dado un cajero, cuando intenta abrir informes o anular documentos, recibe «no tienes permiso».
- El modo (simple o contador) viene de la API con la membresía.

El plan dice que la membresía guarda «persona, rol (dueño, cajero, contador, soporte) y modo», y que «el modo es un permiso del usuario, no otra app». Es una decisión de nivel 3: es el modelo de autorización y es cara de revertir. Tiene tres sub-decisiones:

- **A.** Cómo se expresan y se comprueban los permisos.
- **B.** Qué es el modo.
- **C.** Cómo se invita a una persona.

Restricciones duras:

- [ADR-0006](0006-aislamiento-multiempresa-con-rls.md) y [ADR-0011](0011-pertenecer-a-varias-empresas.md): RLS forzado, `conta_api` sin `BYPASSRLS`, ni `SECURITY DEFINER` ni estado de empresa en el servidor.
- El dominio no importa frameworks.
- Ninguna membresía se borra: la migración 0004 dejó escrito que el retiro sería sin borrar la fila.
- Todavía no existen los endpoints de informes (EP-16) ni de anulación (EP-06).
- Una persona lo mantiene todo, con capas gratuitas.

Solución obvia conocida: una columna `rol` en la membresía y un decorador `@Roles('dueno')` en cada endpoint, con la lista de roles permitidos.

## Alternativas consideradas (Verbalized Sampling)

Hubo una ronda completa y una ronda de cola (k = 5). Las evaluó otro agente con los criterios de seguridad (S) y de diseño (D) de la [guía](../forma-de-trabajo/guia-del-coordinador.md#4-criterios-de-evaluación-por-dimensión). Un tercer agente hizo de atacante.

### A. Permisos

| # | Alternativa | Prob. | Ronda | S / D / prom. | Resultado |
| - | ----------- | ----- | ----- | ------------- | --------- |
| 1 | `@Roles(...)` en cada endpoint | 0,35 | Completa | 2,95 / 3,40 / 3,18 | Rechazada: la regla queda regada por los controladores y solo se prueba con e2e |
| 2 | Matriz `rol → permisos` en el dominio y `@Requiere(permiso)` en el endpoint | 0,25 | Completa | 3,60 / 4,35 / 3,98 | **Base elegida** |
| 3 | Permisos sueltos guardados en cada membresía | 0,15 | Completa | 2,80 / 3,25 / 3,03 | Rechazada: los permisos se desvían y la pantalla sería incomprensible para un tendero |
| 4 | Tablas de roles y permisos por empresa | 0,13 | Completa | 2,90 / 2,50 / 2,70 | Rechazada: sobreingeniería para 50 clientes |
| 5 | Motor de políticas (CASL o Casbin) | 0,12 | Completa | 3,30 / 3,00 / 3,15 | Rechazada: dependencia nueva que el dominio no puede importar |
| 6 | El rol también en las políticas RLS | 0,07 | Cola | 3,75 / 2,30 / 3,03 | Rechazada: duplica la regla en SQL y TS, y el rol que la base comprueba lo fija la misma API |
| 7 | El caso de uso vuelve a exigir el permiso | 0,06 | Cola | 4,15 / 4,35 / **4,25** | **Combinada con 2** |
| 8 | Tipo `ContextoConPermiso<P>` que el compilador exige | 0,05 | Cola | 4,40 / 3,95 / 4,18 | Aplazada: se adopta si algún caso de uso olvida exigir su permiso |
| 9 | Rutas separadas por rol | 0,04 | Cola | 2,90 / 2,60 / 2,75 | Rechazada: rompe el contrato con la app |
| 10 | Token de capacidad por empresa | 0,03 | Cola | — | Descartada: ADR-0011 ya rechazó los tokens por empresa (revocación diferida) |

### B. Modo

| # | Alternativa | Prob. | Ronda | S / D / prom. | Resultado |
| - | ----------- | ----- | ----- | ------------- | --------- |
| B1 | Modo derivado del rol | 0,45 | Completa | 3,55 / 4,50 / 4,03 | Rechazada: contradice el plan (un dueño que sabe contabilidad no podría usar el modo contador) |
| B2 | Columna `modo` en la membresía; el rol limita los modos posibles | 0,35 | Completa | 4,00 / 4,35 / **4,18** | **Elegida** |
| B3 | Preferencia global de la persona | 0,12 | Completa | — | Descartada: el criterio pide el modo con la membresía |
| B4 | Modo como permiso, y la app elige | 0,05 | Cola | — | Descartada como opción completa. Su idea se combina con B2 (permiso `usar-modo-contador`) |
| B5 | Modo por dispositivo | 0,03 | Cola | — | Descartada: el plan dice que no es una bandera local |

### C. Invitar

| # | Alternativa | Prob. | Ronda | S / D / prom. | Resultado |
| - | ----------- | ----- | ----- | ------------- | --------- |
| C1 | Por celular, con la membresía creada al instante | 0,40 | Completa | 3,25 / 4,55 / **3,90** | **Base elegida** |
| C2 | Tabla `invitaciones` aparte, buscada por celular al entrar | 0,30 | Completa | 3,75 / 2,90 / 3,33 | Rechazada como tabla. Su consentimiento se toma para C1 |
| C3 | Código de invitación compartido por WhatsApp | 0,15 | Completa | 2,65 / 3,75 / 3,20 | Rechazada: un código filtrado da acceso a la empresa |
| C4 | Enlace firmado enviado con una plantilla de WhatsApp | 0,08 | Cola | 3,65 / 2,35 / 3,00 | Rechazada: otra plantilla de Meta y un costo por mensaje |
| C5 | La persona pide unirse buscando la empresa por NIT | 0,04 | Cola | 2,70 / 3,50 / 3,10 | Rechazada: el NIT sirve para enumerar empresas |

### Contrapunto del atacante

| Ataque (prob. < 0,10) | Daño | Mitigación |
| --- | --- | --- |
| Dos dueños se degradan uno al otro a la vez; o el único dueño se retira | La empresa queda sin quien la gestione | Regla `miembro.ultimo-dueno`. Cada cambio bloquea antes las filas de los dueños activos (`FOR UPDATE`, en orden de id) y después lee a quien actúa. Hay una prueba de integración con dos transacciones a la vez |
| «Invitar» convertido en *upsert* para subirse a dueño | Control total de la empresa | `INSERT` sin `ON CONFLICT`: una membresía vigente repetida responde 409. Solo el dueño gestiona. Nadie cambia su propio rol |
| El miembro retirado sigue viendo la empresa | Fuga de datos | `retirada_en IS NULL` en las dos políticas del usuario; el resolutor solo acepta membresías activas. La fila retirada no se modifica más (disparador) y volver crea una fila nueva |
| Oráculo de celulares e invitaciones masivas | Saber quién usa CONTA, *phishing*, basura en identidad | La respuesta es igual exista o no el celular. Topes de 30 personas por empresa y de 10 invitaciones al día. No se envía ningún mensaje. La persona acepta o rechaza al entrar |
| Rol leído en la guarda y usado más tarde (TOCTOU) | Una anulación hecha por quien ya no podía | El caso de uso vuelve a leer la membresía y exige el permiso dentro de su transacción. El modo nunca autoriza nada |

## Decisión

Se combinan **A2 (típica) con A7 (cola)**, **B2 con la idea de B4** y **C1 con el consentimiento de C2**.

**Permisos (dominio compartido, `compartido/dominio/permisos/`):**

- `Rol`: `dueno`, `contador` o `cajero`. El rol `soporte` del plan es de la consola, no de una empresa, y llega con su propia historia.
- `Permiso`: `ver-empresa`, `vender`, `ver-informes`, `anular-documentos`, `gestionar-miembros` y `usar-modo-contador`.
- Una sola matriz pura dice qué puede cada rol. Lo que no está en ella está negado.
  - El dueño puede todo.
  - El contador puede todo menos gestionar personas.
  - El cajero solo ve la empresa y vende.
- `exigirPermiso(rol, permiso)` lanza `permiso.denegado` («No tienes permiso»).

**Comprobación en dos capas:**

- `ResolutorPorMembresia` devuelve un `ContextoDeMiembro` (empresa, persona y rol). Lo lee de la membresía activa en cada petición, sin caché.
- Cada endpoint con `GuardaDeEmpresa` declara `@Requiere(Permiso.X)`. La guarda responde 403 `permiso.denegado` y niega por defecto: un endpoint sin `@Requiere` falla antes de tocar la base.
- Los casos de uso que cambian algo vuelven a leer la membresía de quien actúa dentro de su propia transacción y exigen el permiso.
- Cuando lleguen los informes (EP-16) y la anulación (EP-06), sus endpoints llevarán `@Requiere(Permiso.VerInformes)` y `@Requiere(Permiso.AnularDocumentos)`, y sus casos de uso, `exigirPermiso`. Una prueba e2e ya ejercita esos dos permisos con endpoints de prueba.

**Modo:**

- La columna `modo` (`simple` o `contador`) va en la membresía.
- Por defecto, el contador entra en modo contador y los demás en simple.
- Solo un rol con `usar-modo-contador` puede estar en modo contador. Lo exigen el dominio y un `CHECK` en la base.
- Si un rol cambia a uno que no permite el modo actual, el modo vuelve a simple.
- El modo no autoriza nada.
- `GET /empresas` devuelve con cada empresa el `rol`, el `modo`, el `estado` y los `permisos`, para que la app muestre u oculte acciones. Quien decide es la API.

**Membresía con ciclo de vida (migración `0005_roles_y_modos.sql`):**

- Cada membresía tiene su propio `id`. Un índice único parcial `(empresa_id, usuario_id) WHERE retirada_en IS NULL` permite una sola vigente por persona.
- Los estados son: invitada (sin `aceptada_en`), activa y retirada (`retirada_en` y `retirada_por`). La fila nunca se borra. Una retirada no se modifica más, y la aceptación no se deshace (disparador `proteger_historia_de_membresia`).
- `conta_api` recibe `UPDATE` solo de `rol`, `modo`, `aceptada_en`, `retirada_en` y `retirada_por`. Sigue sin `DELETE`.
- Las filas que ya existían quedan como dueño, activas y en modo simple.

**Invitar y responder:**

- `POST /miembros {celular, rol, modo?}`, con `X-Empresa` y el permiso `gestionar-miembros`. Busca o registra a la persona en identidad (`RegistrarPersona`, por la API pública del módulo) y crea la membresía invitada.
- La persona ve la invitación en `GET /empresas` y responde con `POST /empresas/:id/invitacion/aceptar|rechazar`, que solo pide sesión.
- `GET /miembros` lista a las personas con el celular enmascarado.
- `PATCH /miembros/:usuarioId {rol?, modo?}` cambia el rol o el modo. Nadie cambia su propio rol.
- `DELETE /miembros/:usuarioId` retira a una persona. Cada quien puede salirse, pero nunca el último dueño.

**App:**

- La lista de negocios muestra las invitaciones con «Aceptar» y «No, gracias».
- Adentro se ve el rol y el modo.
- Solo quien tiene `gestionar-miembros` ve el botón «Personas del negocio» (invitar y quitar).

## Consecuencias

- Un cambio de rol, un retiro o un rechazo valen desde la petición siguiente.
- Cada petición de empresa sigue haciendo dos consultas antes del caso de uso: sesión, y membresía con su rol.
- Cambiar los permisos de un rol es editar la matriz y sus pruebas, sin tocar los controladores. Un rol nuevo necesita además ampliar el `CHECK` de la migración.
- El cambio de rol se guarda sobre la misma fila: la historia de roles no queda. La auditoría de EP-18 registrará cada cambio con quién lo hizo.
- Una invitación registra a la persona en `conta_identidad.usuarios` aunque nunca entre. Es solo el celular, que el dueño ya conoce.
- HU-04.04 debe exigir el segundo factor por rol (contador) **y** por modo contador. Si no, un dueño en modo contador lo esquivaría.
- Si algún caso de uso olvida `exigirPermiso`, se adopta la alternativa 8: el tipo `ContextoConPermiso<P>`.
