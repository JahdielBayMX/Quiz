Quiz Platform — V1.0

OBJETIVO
Plataforma reutilizable de quizzes para múltiples clientes. El contenido se administra mediante JSON y el engine compartido no necesita modificarse para agregar o reemplazar quizzes.

V1.0 INCLUYE
- Quizzes por cliente/año/mes/slug.
- Múltiples clientes en un mismo proyecto.
- Branding por cliente: logo, nombre y colores.
- Pantalla inicial.
- Preguntas, opciones y pistas.
- Resultados personalizados por porcentaje.
- Confeti únicamente desde 80%.
- Revisión detallada con respuesta correcta, explicación y referencia bíblica cuando exista.
- Botón “Revive el mensaje” en resultado y revisión, usando videoUrl del JSON.
- Botones principales del resultado en este orden:
  1. Revisar respuestas
  2. Revive el mensaje
  3. Intentar de nuevo
- Compartir resultado.
- Descargar imagen PNG del resultado.
- Imagen compartida con branding del cliente.
- Estados draft / published / archived.
- Validación automática del contenido antes de publicar.
- Diseño responsive para PC, iPhone y Android.
- Soporte de modo claro/oscuro.
- Sin programación automática, catálogo público, base de datos, autenticación, analítica ni panel administrativo.

ESTRUCTURA
- /engine/quiz-engine.js → lógica reutilizable
- /styles/quiz.css → estilos globales
- /clients/{client-slug}.json → configuración y branding del cliente
- /quizzes/{client-slug}/{year}/{month}/{quiz-slug}.json → contenido de cada quiz
- /templates/quiz-template.json → plantilla para nuevos quizzes
- /templates/client-template.json → plantilla para nuevos clientes
- /templates/README.txt → instrucciones rápidas
- /tools/validate-quizzes.mjs → validador antes del deploy

FLUJO PARA UN NUEVO QUIZ
1. Copia /templates/quiz-template.json.
2. Déjalo como "status": "draft" mientras trabajas.
3. Cambia id y slug.
4. Completa title, subtitle y startPurpose.
5. Coloca los datos correctos del cliente.
6. Define year y month.
7. Agrega preguntas, opciones, correctIndex y explicaciones.
8. Guarda el archivo en /quizzes/{client-slug}/{year}/{month}/{quiz-slug}.json.
9. Ejecuta:
   node tools/validate-quizzes.mjs
10. Abre la URL del quiz y haz una prueba completa.
11. Cuando todo esté correcto, cambia status a "published".
12. Ejecuta nuevamente la validación.
13. Haz commit/push y deja que Vercel haga el deploy.

PARA CAMBIAR UN QUIZ EXISTENTE
Edita o reemplaza únicamente su JSON. No modifiques el engine.

PARA RETIRAR UN QUIZ
Cambia:
"status": "archived"

Después valida y haz deploy. El archivo se conserva para referencia.

PARA AGREGAR UN CLIENTE
1. Copia /templates/client-template.json.
2. Cambia id, slug y name.
3. Define branding.
4. Guarda como /clients/{client-slug}.json.
5. Ejecuta la validación.

PUBLICACIÓN
- draft → preparación, no público
- published → público
- archived → retirado

VALIDACIÓN
Requisito: Node.js 18+.
Desde la raíz del proyecto:
  node tools/validate-quizzes.mjs

La validación revisa JSON, cliente, ruta, periodo, status, preguntas, opciones, correctIndex y coincidencias entre el quiz y su cliente.

REGLAS DE ARCHIVOS
- El slug del cliente debe coincidir exactamente con la carpeta y la URL.
- El slug del quiz debe coincidir con el nombre del archivo.
- Mantener nombres de archivos y carpetas en minúsculas.
- correctIndex empieza en 0: 0=A, 1=B, 2=C, 3=D.
- Cada pregunta debe tener un id único dentro de ese quiz.
- No modificar engine/quiz-engine.js para agregar contenido.

URL PÚBLICA
/quiz/{client-slug}/{year}/{month}/{quiz-slug}

VERSIÓN
V1.0 — paquete maestro estable.
