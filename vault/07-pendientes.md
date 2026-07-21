# Pendientes

- Migración del import de `FADE_QUICK` en Huginn. En la copia auditada de `/home/diego/Projects/huginn` el 19 de julio de 2026 no apareció ninguna referencia directa, pero el pendiente sigue abierto como chequeo de integración cruzada hasta cerrar por completo el retiro del token.
- Verificar en Firefox y Safari el comportamiento de `offset-path` con `border-box` frente a la solución actual basada en `inset(... round ...) border-box`.
- Medir tree shaking en un escenario de uso real con múltiples variants combinados, no solo en los dos extremos ya probados (`pressable` mínimo contra `all-exports`).
- Definir un principio explícito de degradación por capacidad de hardware. El repo actual respeta reduced motion, pero no resuelve todavía una política separada de degradación por GPU/CPU o por costo visual del efecto.
