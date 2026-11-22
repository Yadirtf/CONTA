# Instrucciones para agentes en CONTA

Responde y documenta en español.

Antes de trabajar, lee:
- `Docs/arquitectura/arquitectura-limpia.md`: capas, reglas de dependencia y estructura. No se rompen sin un ADR.
- `Docs/forma-de-trabajo/guia-del-coordinador.md`: niveles de decisión, proceso de Verbalized Sampling, Definición de Hecho y lista de revisión.
- La historia `HU-xx.yy` de `Docs/backlog/backlog.md` en la que trabajas.

Reglas que nunca se negocian:
- El dominio no importa frameworks, ORM, HTTP ni SDKs.
- Dinero con tipo exacto; nunca `float` ni `double`.
- Documentos enviados a la DIAN y asientos contables no se editan ni se borran.
- Toda tabla de negocio lleva `empresa_id` con Row Level Security y prueba de aislamiento.
- Llamadas a la DIAN y a Wompi en cola, idempotentes y con registro de intentos.
- Sin secretos ni certificados en código, logs o commits.

Para historias marcadas **[VS]** o decisiones caras de revertir: genera alternativas con probabilidad (ronda completa y ronda de cola, k = 5) usando `Docs/forma-de-trabajo/plantillas-de-prompts.md`, que las evalúe otro agente, y registra la decisión en el PR o en `Docs/decisiones/`.

Una historia por PR. Actualiza su estado en el backlog en el mismo PR.
