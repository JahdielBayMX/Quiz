PLANTILLAS DE CONTENIDO — QUIZ PLATFORM V1.0

La plataforma está diseñada para cambiar contenido sin modificar el engine.

NUEVO CLIENTE
1. Copia client-template.json.
2. Cambia id, slug y name.
3. Define el branding si el cliente lo necesita.
4. Guarda el archivo en /clients/{client-slug}.json.

NUEVO QUIZ
1. Copia quiz-template.json.
2. Déjalo con status: "draft" mientras lo preparas.
3. Cambia id, slug, title, subtitle y startPurpose.
4. Coloca los datos del cliente correcto.
5. Define year y month.
6. Escribe las preguntas, opciones y respuestas correctas.
7. Guarda el archivo en /quizzes/{client-slug}/{year}/{month}/{quiz-slug}.json.
8. Ejecuta: node tools/validate-quizzes.mjs
9. Abre la URL y prueba el quiz completo.
10. Cuando todo esté correcto, cambia status a "published".
11. Ejecuta nuevamente la validación y haz deploy.

PARA RETIRAR UN QUIZ
Cambia status a "archived" y vuelve a hacer deploy.
No es necesario borrar el archivo.

REGLAS IMPORTANTES
- El slug del cliente debe coincidir exactamente con la carpeta y la URL.
- El slug del quiz debe coincidir con el nombre del archivo.
- Los nombres de archivos y carpetas deben usar minúsculas.
- correctIndex empieza en 0: 0=A, 1=B, 2=C, 3=D.
- Cada pregunta debe tener un id único dentro de ese quiz.
- videoUrl controla el botón “Revive el mensaje”.
- No modifiques engine/quiz-engine.js para agregar contenido.
