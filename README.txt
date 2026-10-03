FASE 2.1 - Pantalla inicial

Cambios:
- Nueva pantalla inicial antes de la primera pregunta.
- Muestra título, subtítulo, propósito y número de preguntas.
- Botón Comenzar configurable desde buttons.start; si no existe, usa "Comenzar".
- No muestra duración/tiempo.
- El motor y los JSON existentes siguen siendo reutilizables.
- No se modificó la revisión de respuestas.

Rutas:
/quiz/sabiduria
/quiz/diagnostico-parte-3

Para agregar otro quiz: coloca su JSON en /quizzes/ y usa su slug en /quiz/<slug>.
