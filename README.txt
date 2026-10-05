Quiz Platform — Phase 11

OBJETIVO DE ESTA FASE
Agregar identidad visual por cliente sin modificar el engine de cada quiz. La marca se controla desde /clients/{client-slug}.json.

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


FASE 12 — PERSONALIZACIÓN POR CLIENTE
En la configuración del cliente se puede definir:
- branding.displayName → nombre que se muestra en el quiz.
- branding.logoUrl → URL de un logo; dejar vacío para mostrar solo el nombre.
- branding.primaryColor → color principal para botones, progreso y acentos.
- branding.accentColor → color secundario para elementos de resultado.
- branding.lightBackground → color de fondo de referencia para el tema claro.
- branding.darkBackground → color de fondo utilizado en la imagen PNG compartida.

Ejemplo:
"branding": {
  "displayName": "Iglesia Comunidad de Gracia",
  "logoUrl": "",
  "primaryColor": "#2563eb",
  "accentColor": "#36c98f",
  "lightBackground": "#f6f8fb",
  "darkBackground": "#0f141b"
}

Para personalizar otro cliente, solo se modifica su JSON dentro de /clients/. No se modifica quiz-engine.js.
