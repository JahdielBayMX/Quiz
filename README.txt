Quiz Platform — Phase 15

OBJETIVO DE ESTA FASE
Dejar definido y simplificado el flujo definitivo para crear y publicar contenido sin modificar el engine.

REGLA PRINCIPAL
Para agregar o reemplazar contenido:
1. Crear/copiar el JSON del quiz.
2. Editar su contenido.
3. Validarlo.
4. Probarlo.
5. Cambiar status a published.
6. Hacer deploy.

No se requiere programación automática ni modificar el engine.

ESTRUCTURA
- /engine/quiz-engine.js → lógica reutilizable
- /styles/quiz.css → estilos globales
- /clients/{client-slug}.json → configuración y branding del cliente
- /quizzes/{client-slug}/{year}/{month}/{quiz-slug}.json → contenido de cada quiz
- /templates/quiz-template.json → plantilla para crear quizzes
- /templates/client-template.json → plantilla para crear clientes
- /templates/README.txt → instrucciones rápidas de contenido
- /tools/validate-quizzes.mjs → validación antes del deploy

FLUJO PARA UN NUEVO QUIZ
1. Copia /templates/quiz-template.json.
2. Déjalo como "status": "draft" mientras trabajas.
3. Cambia id y slug.
4. Completa title, subtitle y startPurpose.
5. Coloca los datos correctos del cliente.
6. Define year y month.
7. Agrega las preguntas, opciones, correctIndex y explicaciones.
8. Guarda el archivo en la carpeta correspondiente.
9. Ejecuta:
   node tools/validate-quizzes.mjs
10. Abre la URL del quiz y haz una prueba completa.
11. Cuando todo esté correcto, cambia status a "published".
12. Ejecuta nuevamente la validación.
13. Haz commit/push y deja que Vercel haga el deploy.

PARA CAMBIAR UN QUIZ EXISTENTE
Solo reemplaza o edita su JSON. No modifiques el engine.
Si el contenido es un nuevo periodo, crea el JSON en la carpeta correspondiente de año/mes.

PARA RETIRAR UN QUIZ
Cambia:
"status": "archived"

Después valida y haz deploy. El archivo se conserva para referencia y el quiz deja de estar disponible.

PARA AGREGAR UN CLIENTE
1. Copia /templates/client-template.json.
2. Cambia id, slug y name.
3. Define branding si corresponde.
4. Guarda como /clients/{client-slug}.json.
5. Ejecuta la validación.

PUBLICACIÓN
- draft → preparación, no público
- published → público
- archived → retirado

VALIDACIÓN
Requisito: Node.js 18+.
Desde la raíz:
  node tools/validate-quizzes.mjs

La validación revisa JSON, cliente, ruta, periodo, status, preguntas, opciones, correctIndex y coincidencias entre el quiz y su cliente.

BOTONES CONSERVADOS EN EL RESULTADO
- Revisar respuestas
- Intentar de nuevo
- Compartir mi resultado
- Descargar imagen

ARQUITECTURA ACTUAL
La plataforma está preparada para múltiples clientes y múltiples quizzes con un solo engine compartido. El contenido vive en JSON y la publicación se controla desde cada archivo.
FASE 18 — AJUSTE FINAL DE UX

En la pantalla final, las tres acciones principales aparecen en este orden:
1. Revisar respuestas
2. Revive el mensaje
3. Intentar de nuevo

“Revive el mensaje” utiliza el videoUrl definido en el JSON del quiz.

El logo y nombre de la iglesia definidos en branding aparecen de forma persistente en las pantallas del quiz, resultado y revisión.

