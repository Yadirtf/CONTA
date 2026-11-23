# Protocolo de encargos: de un pedido de Inge a un resultado de calidad

Inge pide las cosas como se piden a un colega: «quiero que se pueda mandar la factura por WhatsApp», «el botón de cobrar está muy pequeño», «no me deja facturar sin internet». Este protocolo dice cómo el coordinador convierte cada pedido en un **encargo** (brief) para un agente, de forma que el agente no tome el camino rápido y genérico, sino que entregue algo que cumpla la arquitectura, el backlog y la Definición de Hecho.

**Regla central:** Inge nunca tiene que escribir prompts. El coordinador hace la traducción, y ningún agente recibe un pedido «crudo».

Documentos que usa este protocolo: [guía del coordinador](guia-del-coordinador.md) (niveles de decisión, proceso VS, Definición de Hecho, revisión), [plantillas de prompts](plantillas-de-prompts.md) (los prompts de Verbalized Sampling que van dentro del encargo), [backlog](../backlog/backlog.md) y [arquitectura](../arquitectura/arquitectura-limpia.md).

## 1. Los seis pasos del coordinador

| Paso | Qué hace el coordinador | Resultado |
| --- | --- | --- |
| 1. Clasificar | Decide el tipo de pedido: Implementar, Ajustar, Arreglar, Investigar u Operar (sección 2) | Tipo |
| 2. Ubicar | Busca la historia `HU-xx.yy` y el issue de GitHub. Si no existe, crea la historia en el backlog con criterios de aceptación | Historia e issue |
| 3. Completar | Llena lo que Inge no dijo con lo que ya dicen el plan, el backlog y la arquitectura. Solo le pregunta a Inge si la respuesta cambia el objetivo (sección 4) | Contexto completo |
| 4. Nivelar | Asigna el nivel de decisión (0 a 3). Si es 2 o 3, el encargo incluye el proceso de Verbalized Sampling | Nivel y rondas VS |
| 5. Redactar | Escribe el encargo con la plantilla común más el bloque del tipo (sección 3) | Encargo |
| 6. Verificar | Revisa la entrega del agente contra la Definición de Hecho antes de llevarla a Inge (sección 6) | Resultado aprobado o devuelto |

## 2. Tipos de pedido

| Tipo | Cómo suele sonar | Riesgo típico si se hace rápido | Qué añade el encargo |
| --- | --- | --- | --- |
| **Implementar** | «quiero que…», «agrega…», «necesito que se pueda…» | Solución de manual que no encaja con el modo simple o rompe capas | Historia completa, decisiones [VS], pruebas por capa |
| **Ajustar** | «cambia…», «se ve…», «mejor que…» | Arreglar una pantalla y romper otra; cambiar el comportamiento sin querer | Qué no debe cambiar, pruebas de regresión, ambos modos |
| **Arreglar** | «no funciona…», «sale un error…», «no me deja…» | Tapar el síntoma sin encontrar la causa | Reproducción, hipótesis con VS, prueba que falla primero, causa raíz |
| **Investigar** | «¿qué conviene…?», «¿cómo hacen…?», «revisa si…» | Responder con la opción más conocida sin compararla | Fuentes, alternativas con probabilidad, recomendación |
| **Operar** | «configura…», «crea la rama…», «sube…» | Cambiar algo que no se puede deshacer sin avisar | Qué es irreversible, cómo se verifica, cómo se revierte |

## 3. Plantilla del encargo

### 3.1 Bloque común (todos los encargos)

```
Encargo para: <rol del agente: Explorador | Generador | Contrapunto | Evaluador | Implementador | Revisor>
Tipo de pedido: <Implementar | Ajustar | Arreglar | Investigar | Operar>
Pedido original de Inge: "<texto literal>"
Lo que significa: <el pedido en una o dos frases, en términos del producto>
Historia: HU-xx.yy — <título> · issue #<n> · rama base: develop
Usuario afectado: <dueño | cajero | contador | administrador | visitante>, modo <simple | contador>
Carpeta y capas: <api | web | app> / <dominio | aplicación | infraestructura | presentación>
Nivel de decisión: <0 | 1 | 2 | 3>

Contexto que debes leer antes de empezar:
- Docs/arquitectura/arquitectura-limpia.md
- <ADR relacionados>
- <archivos de código relevantes>

Restricciones duras:
- Las reglas que nunca se negocian de CLAUDE.md
- <restricciones propias del pedido>

Solución obvia conocida: <la primera que se le ocurriría a cualquiera>
  No está prohibida, pero debe compararse con alternativas si el nivel es 2 o 3.

Criterios de aceptación:
- Dado …, cuando …, entonces …
- Caso de error: …

Criterios de calidad que pesan más en este pedido: <tabla de la dimensión de la guía, sección 4>

Entregable: <PR hacia develop | nota de decisión | informe | revisión>
Definición de Hecho: Docs/forma-de-trabajo/guia-del-coordinador.md, sección 7
Formato de entrega: sección 5 de este protocolo
```

### 3.2 Bloque Verbalized Sampling (nivel 2 o 3)

```
Antes de programar:
1. Genera 5 alternativas con su probabilidad, muestreadas de la distribución completa
   (plantillas-de-prompts.md, sección 1, o la de la dimensión en la sección 5).
2. Genera 5 alternativas más, distintas, cada una con probabilidad menor a 0,10 (sección 2).
3. Entrégalas sin elegir. Otro agente las evalúa (sección 6 de las plantillas).
4. Implementa la alternativa elegida y pon la nota de decisión en el PR (guía, sección 8).
Si es nivel 3, el coordinador escribe el ADR y, si hay empate, lo decide Inge.
```

### 3.3 Bloque por tipo

**Implementar**
```
- Partir la historia en tareas por capa, de adentro hacia afuera: dominio → aplicación → infraestructura → presentación.
- Pruebas: unitarias del dominio primero; integración por adaptador; flujos críticos en verde.
- Modo simple: palabras de la calle, máximo de toques: <n>.
- Sin internet: <qué debe pasar>.
```

**Ajustar**
```
- Comportamiento actual: <qué hace hoy, con captura o enlace>.
- Comportamiento deseado: <qué debe hacer>.
- No debe cambiar: <lista: otros flujos, el otro modo, la API pública, los datos guardados>.
- Pruebas de regresión: <qué pruebas existentes deben seguir pasando; qué golden tests se actualizan>.
- Si el ajuste es de UX: genera 3 a 5 variantes del cambio (con probabilidad) antes de elegir.
```

**Arreglar**
```
- Síntoma: <qué ve el usuario>.
- Cómo reproducirlo: <pasos, empresa de prueba, dispositivo, conexión>.
- Esperado y actual: <…>.
- Evidencia: <error de Sentry, log, captura>.
- Antes de corregir: lista 5 causas posibles con su probabilidad, incluidas al menos 2 con probabilidad menor a 0,10,
  y descarta cada una con evidencia. No corrijas hasta tener la causa raíz confirmada.
- Escribe primero una prueba que falle por el error, luego la corrección que la hace pasar.
- Revisa si la misma causa afecta a otros módulos o empresas.
- Si el error tocó documentos DIAN, dinero o datos de otra empresa: avisa al coordinador de inmediato.
```

**Investigar**
```
- Pregunta: <qué hay que decidir>.
- Fuentes válidas: <norma DIAN, documentación oficial, código del repo>; cita cada hecho con su fuente.
- Entrega: 5 opciones con probabilidad (completa) + 5 de la cola, criterios ponderados y una recomendación.
- Di qué no pudiste verificar.
```

**Operar**
```
- Qué se va a cambiar y dónde (GitHub, Cloudflare, Neon, tiendas).
- ¿Se puede deshacer? Si no, el coordinador pide la aprobación de Inge antes.
- Cómo se verifica que quedó bien.
- Cómo se revierte.
- Nunca: secretos en el repo, en logs ni en el texto del PR.
```

## 4. Cuándo preguntar a Inge y cuándo no

**No preguntar** (el coordinador decide con la documentación y lo dice en la entrega):
- Detalles técnicos internos, nombres, estructura de código.
- Lo que ya responden el plan, el backlog, la arquitectura o un ADR.
- Cuál de dos lecturas de un pedido es la más probable: se trabaja en esa y se dice cuál se eligió.

**Preguntar** (con una tarjeta de decisión, una sola vez, con recomendación):
- La decisión cambia lo que Inge quiere lograr, el precio, el alcance de una fase o la experiencia del cliente.
- Un ADR de nivel 3 queda empatado.
- El paso no se puede deshacer: producción, datos reales, mensajes a clientes, tiendas.

## 5. Formato de entrega del agente

Todo agente devuelve su trabajo con este formato, para que el coordinador pueda verificarlo rápido:

```
Resultado: <qué quedó hecho, en una o dos frases>
Enlace: <PR, ADR o informe>
Decisión: <alternativa elegida y si es la típica o de la cola; enlace a la nota de decisión>
Pruebas: <qué se corrió y resultado; qué no se pudo probar y por qué>
Definición de Hecho: <casillas cumplidas; las que faltan y por qué>
Riesgos y pendientes: <lo que el coordinador debe saber>
Lecturas que hice: <supuestos tomados por falta de información>
```

## 6. Verificación del coordinador antes de llevarlo a Inge

El coordinador devuelve el trabajo al agente, sin molestar a Inge, si:
- Falta alguna casilla de la Definición de Hecho sin una razón aceptable.
- Es nivel 2 o 3 y no hay alternativas de la cola o las alternativas son variaciones de la misma idea.
- El agente generó y evaluó sus propias alternativas.
- La entrega dice «funciona» sin evidencia de pruebas.
- El arreglo no explica la causa raíz.

Cuando todo está bien, el coordinador le cuenta a Inge el resultado en lenguaje del producto, con el enlace, y solo pide algo si hay una decisión que es de ella.

## 7. Ejemplos

### Ejemplo A. Implementar

Pedido de Inge: «quiero que la factura se pueda mandar por WhatsApp».

```
Encargo para: Generador, luego Implementador
Tipo de pedido: Implementar
Lo que significa: después de emitir, el dueño comparte el PDF con QR al comprador por WhatsApp en un toque.
Historia: HU-06.01 (criterio de compartir) · issue #<n>
Usuario afectado: dueño y cajero, modo simple
Carpeta y capas: app / presentación y datos; api / aplicación (enlace temporal al PDF)
Nivel de decisión: 2
Restricciones duras: el enlace al PDF no expone datos de otra empresa y vence; sin cobros dentro de la app Android.
Solución obvia conocida: botón "Compartir" que abre el menú del sistema con el PDF adjunto.
Bloque VS: sí (UX y seguridad del enlace).
Bloque Implementar: máximo 1 toque después de emitir; sin internet queda en cola y se avisa.
```

### Ejemplo B. Ajustar

Pedido de Inge: «el botón de cobrar se ve muy pequeño».

```
Tipo de pedido: Ajustar
Lo que significa: el botón principal de la venta debe ser más fácil de tocar con una mano en pantallas pequeñas.
Nivel de decisión: 2 (lo ve el usuario)
No debe cambiar: el flujo de 3 toques, el modo contador, los golden tests de otras pantallas.
Bloque Ajustar: 3 a 5 variantes con probabilidad (tamaño, posición fija abajo, botón flotante, barra de total…);
  área de toque ≥ 48 dp; prueba en 360 × 640.
```

### Ejemplo C. Arreglar

Pedido de Inge: «no me deja facturar sin internet».

```
Tipo de pedido: Arreglar
Síntoma: en modo avión, al tocar "cobrar" aparece un error y la venta no se guarda.
Cómo reproducirlo: empresa de prueba, Android gama baja, modo avión, producto frecuente, consumidor final.
Antes de corregir: 5 causas posibles con probabilidad (p. ej. se agotó el bloque de consecutivos, la cola local
  falla al escribir, la pantalla espera respuesta del servidor, migración de Drift pendiente, permiso de rol mal leído
  sin conexión) y descartar cada una con evidencia.
Primero la prueba de integración "vender sin internet" que falla; luego la corrección.
Revisa si afecta al POS electrónico y a las notas.
```
