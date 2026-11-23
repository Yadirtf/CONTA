# Instrucciones para agentes en CONTA

Responde y documenta en español.

## Si eres el coordinador

Ningún pedido de Inge llega crudo a un agente. Cada pedido (implementar, ajustar, arreglar, investigar u operar) se traduce en un encargo con `Docs/forma-de-trabajo/protocolo-de-encargos.md`: clasificar, ubicar la historia e issue, completar el contexto, fijar el nivel de decisión, redactar el encargo y verificar la entrega contra la Definición de Hecho antes de llevarla a Inge.

## Antes de trabajar, lee

- `Docs/arquitectura/arquitectura-limpia.md`: capas, reglas de dependencia y estructura. No se rompen sin un ADR.
- `Docs/forma-de-trabajo/guia-del-coordinador.md`: niveles de decisión, proceso de Verbalized Sampling, Definición de Hecho y lista de revisión.
- `Docs/forma-de-trabajo/flujo-de-ramas.md`: ramas, PR hacia `develop`, versiones y artefactos.
- La historia `HU-xx.yy` de `Docs/backlog/backlog.md` y su issue de GitHub.

## Carpetas

`api/`, `web/` y `app/` son aplicaciones separadas, cada una con su propia lógica. Ninguna importa código de otra; solo comparten datos de `contratos/`: `openapi.yaml` y `diseno/tokens.json` (colores, espacios y tipografía, [ADR-0009](Docs/decisiones/0009-sistema-visual-y-tokens-compartidos.md)). Ningún componente lleva un color suelto: usa los tokens. Toda regla fiscal o contable vive en `api/`.

## Reglas que nunca se negocian

- El dominio no importa frameworks, ORM, HTTP ni SDKs.
- Dinero con tipo exacto; nunca `float` ni `double`.
- Documentos enviados a la DIAN y asientos contables no se editan ni se borran.
- Toda tabla de negocio lleva `empresa_id` con Row Level Security y prueba de aislamiento; la API usa un rol sin `BYPASSRLS`.
- Llamadas a la DIAN y a Wompi en cola, idempotentes y con registro de intentos.
- Sin secretos ni certificados en código, logs o commits.
- Todo `actions/upload-artifact` lleva `retention-days: 2`.

## Calidad

Para historias marcadas **[VS]** o decisiones caras de revertir: genera alternativas con probabilidad (ronda completa y ronda de cola, k = 5) usando `Docs/forma-de-trabajo/plantillas-de-prompts.md`, que las evalúe otro agente, y registra la decisión en el PR o en `Docs/decisiones/`. Entrega con el formato de la sección 5 del protocolo de encargos.

Una historia por rama y por PR, hacia `develop`, con `Closes #<issue>`. Actualiza su estado en el backlog en el mismo PR.
