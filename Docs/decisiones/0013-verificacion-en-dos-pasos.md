# ADR-0013. Verificación en dos pasos: app autenticadora (TOTP) exigida por membresía al trabajar como contador, por una jornada

- Estado: Propuesto
- Fecha: 2026-11-26
- Historia: HU-04.04
- Decide: Inge

## Contexto

HU-04.04: «Dado un usuario con rol contador o administrador, cuando inicia sesión, entonces se exige el segundo factor». El [ADR-0012](0012-roles-y-modos.md) añade que se exige por rol contador **y** por modo contador; si no, un dueño en modo contador lo esquivaría.

Hoy el único factor es el código por WhatsApp al celular ([ADR-0010](0010-acceso-con-celular-y-codigo-por-whatsapp.md)), y la sesión dura 30 días. Un contador lleva la contabilidad y la facturación de muchas empresas: si alguien le roba el WhatsApp (cambio de SIM o engaño para que pase el código), entra a todos sus clientes.

El rol no es de la persona sino de cada membresía: la misma persona puede ser dueña de su tienda y contadora de otras 20. Cada petición de empresa ya pasa por `GuardaDeEmpresa` → `ResolutorPorMembresia`, que lee la membresía (rol y modo) en esa misma petición.

Es una decisión de nivel 3, porque es autenticación.

**Restricciones duras:**

- El dominio no importa SDKs.
- Ningún secreto va en código, registros o commits, ni en claro en la base.
- El segundo factor debe ser **independiente del celular y de WhatsApp**.
- Sin proveedor pagado nuevo.
- Funciona en la app Flutter, en Android y en la web de Cloudflare.
- La regla vive en `api/`.
- Cubre STRIDE.

**Solución obvia conocida:** TOTP (Google Authenticator) con códigos de recuperación, pedido al iniciar sesión.

## Alternativas consideradas (Verbalized Sampling)

Las generó un agente y las calificó otro, que no las generó. Un tercer agente hizo de contrapunto (atacante) sobre la base TOTP.

Los criterios de seguridad de la guía fueron:

| Criterio | Peso |
| --- | --- |
| Daño máximo si falla | 30 % |
| Defensa en profundidad | 25 % |
| Auditar y detectar abusos | 20 % |
| Fricción para el usuario legítimo | 15 % |
| Costo y complejidad | 10 % |

| # | Alternativa | Prob. | Ronda | Puntaje | Resultado |
| - | ----------- | ----- | ----- | ------- | --------- |
| 8 | **Elevación escalonada: el factor se exige al trabajar como contador, no al abrir sesión, y vale una ventana corta** | 0,07 | Cola | **4,00** | **Elegida como política** |
| 1 | TOTP + 10 códigos de recuperación | 0,45 | Completa | 3,85 | **Elegida como mecanismo** (combinada con la 8) |
| 3 | Passkey / WebAuthn | 0,15 | Completa | 3,85 | Para después: otra forma de pasar el mismo segundo paso |
| 7 | Llave del dispositivo + TOTP solo en dispositivos nuevos | 0,05 | Cola | 3,80 | Para después (ya anotada en ADR-0010) |
| 6 | Aprobación desde un dispositivo de confianza | 0,06 | Cola | 3,70 | Rechazada: fricción alta y recuperación difícil |
| 4 | Clave personal (PIN o contraseña) | 0,15 | Completa | 3,25 | Rechazada: se pasa engañado y se reutiliza entre sitios |
| 2 | Código por correo | 0,15 | Completa | 2,45 | Rechazada: el correo suele estar en el mismo teléfono y exige un proveedor |
| 5 | SMS al mismo celular | 0,10 | Completa | — | Descartada: no es un factor independiente |
| 9 | El dueño aprueba cada dispositivo del contador | 0,04 | Cola | — | Descartada: depende del WhatsApp de otro y no sirve para la consola |
| 10 | Llave FIDO2 para la consola y TOTP para contadores | 0,05 | Cola | — | Duplicado de 3 + 1; se retoma para la consola |

La passkey (3) empata con el TOTP en puntaje: resiste mejor el engaño, pero exige un plugin nativo, `assetlinks.json` y un dominio fijo, con una sola persona manteniendo y una historia de tamaño S. Entra después sin cambiar la regla de la API.

## Decisión

Se eligió la **8 (de la cola) con el mecanismo de la 1 (la típica)**: gana a la solución obvia por *cuándo* se exige, no por el mecanismo.

### Cuándo se exige

- `exigeSegundoFactor(rol, modo)` vive en el dominio compartido: es verdadero para el rol contador y para cualquiera en modo contador.
- `ResolutorPorMembresia` lo evalúa en **cada petición**, con el rol y el modo recién leídos. Si la sesión no tiene el segundo factor vigente, responde 403 `acceso.segundo-factor-requerido`.
  - Un cajero al que suben a contador debe verificar desde la petición siguiente.
  - Un dueño en modo contador también debe verificar.
- No se exige al abrir sesión: el rol depende de la empresa, y el dueño de una tienda no pasa por fricción que no necesita.
- `GET /empresas` devuelve `exigeSegundoFactor` en cada membresía, y la app pide el segundo paso antes de entrar. Quien decide es siempre la API.

### Cuánto dura

- La sesión guarda `verificada_en`, y el segundo factor vale **12 horas** (una jornada), nunca más que la sesión.
- Un token robado de una sesión verificada sirve horas, no 30 días.
- Cerrar la sesión lo termina.

### Mecanismo

- **TOTP de RFC 6238:** HMAC-SHA1, 6 dígitos, pasos de 30 s y un paso de margen. Se implementa con `node:crypto`, sin dependencias.
- **Anti-repetición:** se guarda el último paso aceptado, por persona. Un código no sirve dos veces, ni en otra sesión.
- **Bloqueo:** 5 fallos seguidos bloquean el segundo factor 15 minutos.
- **Inscripción:**
  - Se crea un secreto de 20 bytes, que se muestra una sola vez como QR (`otpauth://`, con el celular enmascarado) y como clave en base32.
  - Queda pendiente 15 minutos hasta que se confirma con un primer código.
  - Al confirmar se entregan **10 códigos de recuperación** de un solo uso (10 caracteres, unos 49 bits) y la sesión queda verificada.
- **Cambiar de app:**
  - Exige que la sesión haya verificado en los **últimos 10 minutos**. El WhatsApp solo nunca basta.
  - Al confirmar la app nueva se cierran las demás sesiones de la persona, y los códigos de recuperación anteriores dejan de servir.
- **Si se pierde la app:** se verifica con un código de recuperación y luego se configura otra app.

### Secretos

- El secreto TOTP se guarda cifrado con **AES-256-GCM**.
  - La clave sale de `SECRETO_SEGUNDO_FACTOR`, una variable del entorno de Render que no está en la base ni en sus respaldos.
  - El id de la persona va como dato asociado, así que un secreto copiado a la fila de otra persona no se descifra.
  - El texto lleva la versión (`v1.`) para poder rotar la clave.
- Los códigos de recuperación se guardan como HMAC-SHA256 con otra clave derivada (HKDF) de la misma variable.
- La base rechaza con `CHECK` cualquier valor que no tenga esos formatos.
- Sin `SECRETO_SEGUNDO_FACTOR`, el segundo factor **falla cerrado** con 503: ningún contador entra, pero nunca se guarda un secreto con una clave inventada.

### Persistencia (migración `0006_segundo_factor.sql`)

Todo va en `conta_identidad`, sin `empresa_id` ni RLS, como el resto de la identidad (ADR-0010): el segundo factor es de la persona, no de una empresa.

- `segundos_factores`: una fila por persona.
- `eventos_de_segundo_factor`: registro de **solo inserción** de cada paso, con quién, qué sesión, cuándo y qué pasó (inscripción, verificación, verificación con recuperación, fallo o bloqueo). Nunca guarda códigos.
- `sesiones.verificada_en`.
- `conta_api` no puede borrar ni vaciar nada, ni cambiar a quién pertenece un segundo factor.

### Endpoints

Todos piden sesión:

| Método y ruta | Qué hace |
| --- | --- |
| `GET /acceso/segundo-factor` | Dice si la persona configuró su app y si la sesión está verificada |
| `POST /acceso/segundo-factor/inscripcion` | Crea la clave |
| `POST /acceso/segundo-factor/inscripcion/confirmacion` | Confirma con el primer código y entrega los códigos de recuperación |
| `POST /acceso/segundo-factor/verificacion` | Verifica con un código de la app o uno de recuperación |

### Controles contra el atacante (contrapunto)

| Ataque | Control |
| --- | --- |
| Roba el WhatsApp o la SIM e inscribe su propia app | Cambiar de app exige haber verificado hace 10 minutos o menos. Sin la app ni un código de recuperación, el WhatsApp no basta. |
| Roba un token de una sesión ya verificada | La verificación dura 12 horas, no 30 días. Al cambiar de app se cierran las demás sesiones. |
| Un dueño en modo contador, o un cajero al que suben a contador | Se exige por rol **o** modo, con la membresía leída en cada petición. |
| Lee un respaldo de la base | El secreto va cifrado con una clave que no está en la base. Los códigos de recuperación van como HMAC con otra clave. |
| Repite un código visto (por encima del hombro, o un proxy) | Anti-repetición por paso de tiempo, por persona. |
| Fuerza bruta del código | 5 fallos bloquean 15 minutos. Además, el límite por IP de `/acceso`. |
| Soporte malicioso | No existe ningún endpoint para desactivar o reasignar el segundo factor, y el registro de eventos queda. |

## Consecuencias

- **Para activarlo en Render**, Inge debe poner `SECRETO_SEGUNDO_FACTOR` con 32 caracteres o más al azar (`openssl rand -hex 32`). Hasta entonces, nadie con rol o modo contador puede trabajar en una empresa: el resto sigue igual.
- **Perder la clave del entorno** deja inservibles los segundos factores ya inscritos; cada contador tendría que configurar otra app. Por eso la clave se guarda también fuera de Render, y rotarla exige agregar `v2` sin quitar `v1`.
- **Fuera de esta historia:**
  - **La consola (administrador):** la API todavía no tiene administradores ni la consola tiene inicio de sesión. La historia que los cree debe:
    - usar este mismo segundo factor, obligatorio siempre y con una ventana más corta;
    - considerar FIDO2 o passkey (alternativa 10).
    - Mientras tanto, la consola no expone datos.
  - **Recuperación asistida:** si alguien pierde la app y los códigos, hoy no hay salida por autoservicio. La recuperación asistida (verificación de identidad, espera de 72 horas con aviso por WhatsApp y cierre de todas las sesiones) queda para EP-18, con la auditoría.
  - **Aviso por WhatsApp** en cada evento del segundo factor: pide una plantilla nueva de Meta. Queda pendiente.
- La app muestra el paso que falte al entrar a un negocio que lo exige. Si la jornada vence mientras trabaja, la API responde 403 `acceso.segundo-factor-requerido` y la persona vuelve a entrar al negocio para verificar.
