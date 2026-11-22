# Guía de trabajo: cómo se orquesta CONTA con Verbalized Sampling

Esta guía dice cómo trabajan el coordinador y los agentes en este proyecto para que el resultado no sea la solución rápida y genérica, sino la mejor que se pudo encontrar. Aplica a cualquier persona o agente que diseñe, programe o revise en CONTA.

Documentos relacionados: [arquitectura limpia](../arquitectura/arquitectura-limpia.md), [backlog](../backlog/backlog.md), [plantillas de prompts](plantillas-de-prompts.md), [decisiones (ADR)](../decisiones/README.md).

## 1. Por qué esta guía existe

Los modelos de lenguaje alineados con preferencias humanas tienden a **colapsar en la respuesta más típica** (colapso de modo). El paper *Verbalized Sampling: How to Mitigate Mode Collapse and Unlock LLM Diversity* (Zhang, Yu, Chong, Sicilia, Tomz, Manning y Shi; Northeastern, Stanford y West Virginia University, 2025) muestra que la causa principal está en los datos: las personas que califican respuestas prefieren lo familiar (**sesgo de tipicidad**), y el entrenamiento amplifica esa preferencia. Cuando varias respuestas son igual de buenas, el modelo elige casi siempre la más común.

Para un producto eso significa: la arquitectura de manual, la pantalla igual a la de la competencia, la lista de seguridad genérica. No siempre es mala, pero **nunca debe ser la única opción que se consideró**.

**Qué propone el paper.** En vez de pedir una respuesta, se pide al modelo que **verbalice una distribución**: varias respuestas con la probabilidad que el modelo le asigna a cada una. Es solo un cambio de prompt, sin entrenamiento ni acceso a los logits.

**Qué midieron:**
- En escritura creativa, la diversidad sube entre 1,6 y 2,1 veces frente a pedir una sola respuesta, y la evaluación humana mejora un 25,7%.
- Recupera cerca del 66,8% de la diversidad del modelo base antes del alineamiento.
- Los modelos más capaces se benefician más.
- No se observó pérdida de exactitud factual ni de seguridad.
- Se puede **ajustar la diversidad** pidiendo respuestas de la «cola» de la distribución (cada una con probabilidad menor a un umbral, por ejemplo 0,10).

**Límites que tenemos en cuenta:**
- Las probabilidades verbalizadas son la estimación del modelo, **no están calibradas**. Sirven para saber qué es lo típico y qué es lo poco común, no como verdad estadística.
- Con muchas alternativas en una sola llamada (k grande) la calidad baja. Se usan k = 5 por llamada y se repite si hacen falta más.
- Diversidad no es calidad. Una opción rara no es buena por ser rara; se evalúa con los mismos criterios que las demás.

Fuentes: [arXiv 2510.01171](https://arxiv.org/abs/2510.01171), [ICML 2026](https://icml.cc/virtual/2026/poster/60489), [repositorio de los autores](https://github.com/CHATS-lab/verbalize-sampling), [página del proyecto](https://simonucl.notion.site/verbalized-sampling).

## 2. Cuándo se aplica

No todo necesita alternativas. Se aplica según el nivel de la decisión:

| Nivel | Ejemplos en CONTA | Qué se hace |
| --- | --- | --- |
| **0. Mecánico** | Renombrar, mover un archivo, corregir un typo, seguir un patrón ya decidido | Directo. Sin alternativas |
| **1. Local** | Nombre de una función, estructura interna de un caso de uso | El agente considera 2–3 opciones en su razonamiento; no se documenta |
| **2. De historia** | Cualquier historia marcada **[VS]** en el backlog; diseño de una pantalla; esquema de una tabla; contrato de un endpoint | **Proceso VS completo** (sección 3) con nota de decisión en el PR |
| **3. Estructural** | Elección de librería o proveedor, patrón entre módulos, autenticación, sincronización sin internet, modelo de seguridad | **Proceso VS completo** + **ADR** en `Docs/decisiones/` antes de programar |

Regla rápida: **si la decisión es cara de revertir, toca dinero, datos fiscales o seguridad, o la va a ver el usuario, es nivel 2 o 3.**

## 3. El proceso VS en 5 pasos

### Paso 1. Encuadrar

Antes de pedir alternativas, se escribe en 5 líneas:
- El problema, en palabras del usuario (dueño, cajero, contador, administrador).
- Las restricciones duras: reglas de la arquitectura, norma DIAN, presupuesto, una persona construyendo.
- Los criterios de evaluación con su peso (ver sección 4).
- Qué sería la «solución obvia», dicha explícitamente, para que el resto de opciones no sean variaciones de ella.

### Paso 2. Generar con distribución verbalizada

Se pide **k = 5 alternativas con probabilidad** en dos rondas:

1. **Ronda de distribución completa:** «5 alternativas muestreadas de la distribución completa, cada una con su probabilidad». Muestra qué es lo típico.
2. **Ronda de cola:** «5 alternativas distintas de las anteriores, cada una con probabilidad menor a 0,10». Saca lo no obvio.

Para decisiones de nivel 3 se añade una tercera ronda por un **agente distinto** con un rol opuesto (por ejemplo, un atacante para seguridad o un cajero con prisa para UX).

Las plantillas exactas están en [plantillas-de-prompts.md](plantillas-de-prompts.md).

### Paso 3. Evaluar

- Se juntan las 10–15 alternativas, se eliminan duplicados y se descartan las que violan una restricción dura (con el motivo).
- Las restantes se califican de 1 a 5 contra los criterios ponderados de la sección 4.
- La evaluación la hace **un agente distinto del que generó**, para no premiar lo propio.
- La probabilidad verbalizada **no es un criterio**. Se muestra para saber si la ganadora es la opción típica o una de la cola.

### Paso 4. Elegir y combinar

- Se eligen las 2 mejores y se pregunta: ¿se pueden combinar? Muchas veces la mejor solución toma la base de la opción típica y un elemento de la cola.
- Si gana la opción típica, está bien, pero la nota de decisión debe decir **qué opción de la cola se descartó y por qué**. Eso prueba que se exploró.
- Si dos opciones quedan empatadas y la decisión es de nivel 3, el coordinador la lleva a Inge con una tarjeta de decisión y una recomendación.

### Paso 5. Registrar

- Nivel 2: una **nota de decisión** en la descripción del PR (formato en la sección 8).
- Nivel 3: un **ADR** en `Docs/decisiones/` con la plantilla, enlazado desde el PR.

## 4. Criterios de evaluación por dimensión

Cada dimensión tiene criterios propios. Los pesos son el punto de partida; el encuadre del paso 1 puede ajustarlos.

### Diseño y arquitectura
| Criterio | Peso |
| --- | --- |
| Respeta las reglas de dependencia y la inmutabilidad fiscal | Restricción dura |
| Facilidad de cambiar el proveedor o la tecnología después | 25% |
| Simplicidad para una persona que mantiene todo | 25% |
| Facilidad de probar sin red ni base de datos | 20% |
| Costo operativo por cliente | 15% |
| Tiempo para tenerla funcionando | 15% |

### Experiencia de usuario
| Criterio | Peso |
| --- | --- |
| Toques y tiempo para completar la tarea principal (meta: factura en 3 toques) | 25% |
| Se entiende sin explicación, con palabras de la calle en modo simple | 25% |
| Funciona en gama baja, pantalla pequeña, una mano y sin internet | 20% |
| Prevención y recuperación de errores (sobre todo en dinero y DIAN) | 20% |
| Accesibilidad (contraste, tamaño de toque ≥ 48 dp, lector de pantalla) | 10% |

En UX se generan alternativas de **flujo**, no solo de estilo visual. Se prueban en papel o prototipo con un piloto cuando la historia es nivel 2 o 3.

### Seguridad
| Criterio | Peso |
| --- | --- |
| Cubre las amenazas STRIDE identificadas para la historia | Restricción dura |
| Daño máximo si falla (radio de impacto: una empresa o todas) | 30% |
| Defensa en profundidad (no depende de un solo control) | 25% |
| Facilidad de auditar y detectar abusos | 20% |
| Fricción para el usuario legítimo | 15% |
| Costo y complejidad de operación | 10% |

En seguridad, la ronda de cola se pide **como atacante**: «5 formas de comprometer esto, cada una con probabilidad menor a 0,10». Los ataques poco probables son justo los que la lista genérica omite.

### Escalabilidad y rendimiento
| Criterio | Peso |
| --- | --- |
| Aguanta 500 clientes y 60 documentos por cliente al mes sin rediseño | 30% |
| Se degrada con gracia (DIAN caída, picos de fin de mes) | 25% |
| Costo de infraestructura al crecer | 20% |
| Complejidad añadida hoy | 25% |

Regla: no se optimiza para 50.000 clientes cuando hay 50. Una opción que escala más pero añade complejidad hoy pierde, salvo que el ADR demuestre que revertirla después sería muy caro.

### Calidad de código
| Criterio | Peso |
| --- | --- |
| Expresa el lenguaje del dominio (nombres en español del negocio: Factura, Asiento, Cartera) | 25% |
| Fácil de probar y con pruebas que documentan las reglas | 25% |
| Bajo acoplamiento entre módulos | 20% |
| Legibilidad para quien llegue después | 20% |
| Rendimiento suficiente | 10% |

## 5. Cómo orquesta el coordinador

### Roles de agente

El coordinador asigna roles por hilo. Un mismo agente no cumple dos roles en la misma decisión de nivel 2 o 3.

| Rol | Qué hace | Cuándo |
| --- | --- | --- |
| **Explorador** | Lee el repo, la norma o la documentación externa y entrega hechos con fuente | Antes de generar, si hay incertidumbre técnica o normativa |
| **Generador** | Produce las alternativas con distribución verbalizada (paso 2) | Toda decisión nivel 2 o 3 |
| **Contrapunto** | Genera desde un rol opuesto (atacante, cajero apurado, contador exigente, auditor DIAN) | Nivel 3 y toda historia de seguridad |
| **Evaluador** | Califica contra los criterios y propone combinación (pasos 3 y 4) | Toda decisión nivel 2 o 3 |
| **Implementador** | Programa la alternativa elegida respetando la arquitectura y la DoD | Después de la decisión |
| **Revisor** | Revisa el PR con la lista de la sección 9 | Todo PR |

### Flujo por historia

```
Historia [VS] lista
   │
   ├─► Explorador (si hace falta)  ──► hechos con fuente
   ├─► Generador: ronda completa + ronda de cola (k = 5 cada una)
   ├─► Contrapunto (nivel 3 o seguridad)
   ├─► Evaluador: matriz, combinación, recomendación
   ├─► ¿Nivel 3 o empate? ── sí ──► tarjeta de decisión a Inge (con recomendación)
   ├─► ADR o nota de decisión
   ├─► Implementador: rama, código, pruebas, PR
   └─► Revisor: lista de revisión ──► correcciones ──► merge cuando la DoD se cumple
```

Para historias sin [VS], el flujo empieza directamente en el implementador, pero el implementador sigue aplicando el nivel 1 en su razonamiento.

### Cómo redacta el coordinador el encargo a un agente

Todo encargo a un hilo o agente incluye estos bloques, en este orden:

```
Historia: HU-xx.yy — <título> (enlace al backlog)
Rol: <Explorador | Generador | Contrapunto | Evaluador | Implementador | Revisor>
Nivel de decisión: <0 | 1 | 2 | 3>
Contexto obligatorio: Docs/arquitectura/arquitectura-limpia.md, <ADR relacionados>
Restricciones duras: <lista>
Solución obvia conocida: <la que se espera que el modelo proponga primero>
Entregable: <alternativas con probabilidad | matriz de evaluación | PR | revisión>
Criterios: <tabla de la dimensión, con pesos ajustados si aplica>
Definición de hecho: sección 7 de la guía
```

Nombrar la **solución obvia** en el encargo es deliberado: obliga a que las alternativas se midan contra ella en lugar de repetirla.

### Qué no debe hacer el coordinador

- Pedir «la mejor solución» en una sola respuesta para una decisión nivel 2 o 3.
- Dejar que el mismo agente genere y evalúe sus propias alternativas.
- Tratar la probabilidad verbalizada como medida de calidad.
- Elegir una opción rara solo por ser diferente.
- Saltarse el ADR porque «es obvio».
- Usar subagentes o investigación profunda para decisiones de nivel 0 o 1: cuesta tiempo y tokens sin beneficio.

## 6. Ritmo de trabajo

- **Inicio de fase:** se refinan las épicas de la fase, se marcan las historias [VS] y se hace el modelo de amenazas de cada épica.
- **Por historia:** encuadre → (VS si aplica) → implementación → revisión → merge. Una historia por PR.
- **Al cerrar una historia:** se actualiza su estado en el backlog en el mismo PR.
- **Al terminar una fase:** se revisa si se cumplió la meta. Si no, no se avanza: se corrige producto o precio con lo que digan los clientes.

## 7. Definición de Hecho

Una historia está **Hecha** solo si se cumple todo:

**Funcional**
- [ ] Todos los criterios de aceptación pasan, incluidos los de error.
- [ ] Probada en Android de gama baja (o emulador equivalente) y en navegador cuando aplica.
- [ ] Textos del modo simple con palabras de la calle; los del modo contador, técnicos y correctos.

**Arquitectura y código**
- [ ] Respeta las capas y reglas de dependencia; CI de dependencias en verde.
- [ ] Sin `float`/`double` para dinero.
- [ ] Ningún documento fiscal ni asiento editable o borrable.
- [ ] Toda tabla nueva tiene `empresa_id`, política RLS y prueba de aislamiento.
- [ ] Llamadas a DIAN y Wompi en cola, idempotentes y con registro de intentos.

**Pruebas**
- [ ] Unitarias de dominio para cada regla nueva; cobertura de ramas del dominio ≥ 90%.
- [ ] Integración para cada adaptador nuevo; contrato si toca DIAN o Wompi.
- [ ] Flujos críticos («factura en 3 toques», «vender sin internet») siguen en verde.

**Seguridad**
- [ ] Amenazas STRIDE de la historia revisadas; sin secretos en código, logs ni commits.
- [ ] Autorización por rol y modo probada.

**Decisión y documentación**
- [ ] Si es [VS]: nota de decisión en el PR o ADR enlazado, con alternativas, probabilidades y descartes.
- [ ] Backlog actualizado (estado de la historia).
- [ ] Contrato OpenAPI regenerado si cambió la API.

**Entrega**
- [ ] PR revisado con la lista de la sección 9 y CI en verde.
- [ ] Observabilidad: errores nuevos llegan a Sentry con `empresaId`.

## 8. Formato de la nota de decisión (nivel 2)

Va en la descripción del PR:

```markdown
### Decisión
**Problema:** ...
**Solución obvia conocida:** ...

| # | Alternativa | Prob. verbalizada | Ronda | Puntaje ponderado | Resultado |
| - | ----------- | ----------------- | ----- | ----------------- | --------- |
| 1 | ...         | 0,40              | completa | 3,6 | Base elegida |
| 2 | ...         | 0,07              | cola     | 3,9 | Combinada con 1 |
| 3 | ...         | 0,05              | cola     | 2,1 | Descartada: ... |

**Elegida:** ... **Por qué:** ...
**Qué se descartó de la cola y por qué:** ...
```

## 9. Revisiones

El revisor usa esta lista y aplica VS también a la revisión: antes de aprobar, pide **5 formas en que este cambio podría fallar en producción, cada una con probabilidad menor a 0,10** y verifica que estén cubiertas o sean aceptables.

**Lista de revisión**
1. ¿Cumple los criterios de aceptación y la Definición de Hecho?
2. ¿El dominio sigue libre de frameworks? ¿Las dependencias apuntan hacia adentro?
3. ¿Los nombres expresan el negocio? ¿Se entiende sin el autor?
4. ¿Qué pasa si la DIAN, Wompi o internet fallan a mitad de la operación?
5. ¿Qué pasa si el mismo mensaje, webhook o envío llega dos veces?
6. ¿Puede una empresa ver o afectar datos de otra?
7. ¿Hay montos, redondeos o impuestos? ¿Están probados con casos límite?
8. ¿La UX sigue siendo de 3 toques y comprensible en modo simple?
9. ¿Hay secretos, datos personales o certificados en logs, errores o respuestas?
10. ¿Las decisiones [VS] están registradas y la opción de la cola descartada está justificada?

Comentarios del revisor: **bloqueante** (rompe DoD, seguridad o reglas fiscales), **importante** (corregir en este PR salvo acuerdo) y **sugerencia** (opcional).

## 10. Antipatrones que esta guía evita

| Antipatrón | Cómo se ve | Qué hacer |
| --- | --- | --- |
| Primera idea | «Usemos JWT en localStorage porque es lo común» | Ronda completa + ronda de cola + matriz de seguridad |
| Diversidad cosmética | 5 alternativas que son la misma con otro nombre | Pedir explícitamente que difieran en el enfoque, no en el detalle |
| Novedad por novedad | Elegir la opción de probabilidad 0,03 porque «marca la diferencia» | Gana el puntaje, no la rareza |
| Autoevaluación | El generador califica sus propias ideas | Evaluador distinto |
| Sobreingeniería | Microservicios para 50 clientes | Criterio de complejidad hoy; ADR para justificar |
| Decisión sin rastro | Nadie sabe por qué se eligió algo | Nota de decisión o ADR siempre en nivel 2 y 3 |
