Quiz Platform — Phase 11

OBJETIVO DE ESTA FASE
Estandarizar la creación de contenido para que agregar un nuevo quiz no requiera modificar el engine.

BOTONES CONSERVADOS EN EL RESULTADO
- Revisar respuestas
- Intentar de nuevo
- Compartir mi resultado
- Descargar imagen

ESTRUCTURA
- /engine/quiz-engine.js → lógica reutilizable
- /styles/quiz.css → estilos globales
- /clients/{client-slug}.json → configuración mínima del cliente
- /quizzes/{client-slug}/{year}/{month}/{quiz-slug}.json → contenido de cada quiz
- /templates/quiz-template.json → plantilla para crear nuevos quizzes
- /templates/client-template.json → plantilla para registrar nuevos clientes

COMO CREAR UN NUEVO QUIZ
1. Copiar /templates/quiz-template.json.
2. Cambiar id y slug del quiz.
3. Completar title, subtitle y startPurpose.
4. Confirmar client.id, client.slug y client.name.
5. Confirmar period.year y period.month.
6. Agregar las preguntas y respuestas.
7. Para cada pregunta, mantener un id único y correcto correctIndex.
8. Opcionalmente agregar hint y bible_ref.
9. Guardar el archivo en:
   /quizzes/{client-slug}/{year}/{month}/{quiz-slug}.json
10. Hacer deploy. No es necesario modificar el engine.

IMPORTANTE
- Los nombres de carpetas y archivos deben usar exactamente minúsculas y coincidir con la URL.
- correctIndex comienza en 0: 0=A, 1=B, 2=C, 3=D.
- El client.slug del quiz debe coincidir con la carpeta del cliente y con la configuración de /clients/.
- El quiz debe permanecer independiente del engine.
