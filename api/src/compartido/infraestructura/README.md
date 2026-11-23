# compartido/infraestructura

Adaptadores transversales: Postgres/Neon con Drizzle (`persistencia/`: el pool, que solo se importa aquí, y `UnidadDeTrabajoPostgres`, que llama a `conta_sistema.fijar_empresa(id)` al abrir cada transacción, HU-01.05), migraciones (`../../../migraciones/`), colas (HU-06.04), llaves, R2, logger.
