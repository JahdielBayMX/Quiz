Quiz Platform — V1.1 + Estadísticas V1

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
- Soporte de idiomas para el quiz: español e inglés mediante "language" en el JSON.
- Textos fijos de la interfaz, revisión, compartir, tarjeta PNG y errores localizados por idioma.
- El panel /statistics/ permanece en español.

ESTADÍSTICAS V1
- Registro de intentos en Supabase.
- Respuestas por pregunta.
- Panel privado en /statistics/.
- Filtros por cliente, quiz, año y mes.
- Dependencia Cliente → Quiz en los filtros.
- Métricas por quiz: Intentos, Aciertos, Errores y Promedio.
- Promedio calculado como promedio real de los porcentajes de los intentos.
- Análisis por pregunta: intentos, correctas, errores y porcentaje de aciertos.
- Identificación de la pregunta con más errores.
- Exportación CSV.
- Modo oscuro.
- Botón Actualizar y cierre de sesión.
- Administración de pruebas: eliminar pruebas de un quiz, de un cliente o todas las pruebas.
- Al eliminar un quiz, la eliminación queda aislada al cliente seleccionado para evitar mezclar clientes con slugs iguales.
- No se recopilan datos personales del participante.
- La clave de Supabase de servicio permanece únicamente en Vercel.
- El quiz continúa funcionando aunque Supabase no esté disponible.

ESTRUCTURA
- /engine/quiz-engine.js → lógica reutilizable
- /styles/quiz.css → estilos globales
- /clients/{client-slug}.json → configuración y branding del cliente
- /quizzes/{client-slug}/{year}/{month}/{quiz-slug}.json → contenido de cada quiz
- /statistics/index.html → panel privado de estadísticas
- /statistics/schema.sql → estructura inicial de Supabase
- /api/quiz-completed.js → recepción de resultados
- /api/stats-dashboard.js → datos del panel
- /api/stats-delete.js → limpieza administrativa de pruebas
- /templates/quiz-template.json → plantilla para nuevos quizzes
- /templates/client-template.json → plantilla para nuevos clientes
- /tools/validate-quizzes.mjs → validador antes del deploy
- /i18n/es.json y /i18n/en.json → textos fijos de interfaz del quiz

FLUJO PARA UN NUEVO QUIZ
1. Copia /templates/quiz-template.json.
2. Déjalo como "status": "draft" mientras trabajas.
3. Cambia id y slug.
4. Define "language": "es" o "language": "en".
5. Completa title, subtitle y startPurpose.
6. Coloca los datos correctos del cliente.
7. Define year y month.
8. Agrega preguntas, opciones, correctIndex y explicaciones.
   - Si el idioma es "en", escribe también title, subtitle, botones, resultados, preguntas, opciones, hints, explicaciones y scoreMessages en inglés.
9. Guarda el archivo en /quizzes/{client-slug}/{year}/{month}/{quiz-slug}.json.
10. Ejecuta:
   node tools/validate-quizzes.mjs
11. Abre la URL del quiz y haz una prueba completa.
12. Revisa el panel /statistics/ y confirma los resultados.
13. Elimina las pruebas realizadas desde Administración de pruebas.
14. Cuando todo esté correcto, cambia status a "published".
15. Ejecuta nuevamente la validación.
16. Haz commit/push y deja que Vercel haga el deploy.

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

PANEL PRIVADO
/statistics/

Variables de entorno requeridas para estadísticas:
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
STATS_DASHBOARD_KEY

FLUJO OPERATIVO FINAL
Crear cliente → crear quiz → probar → revisar estadísticas → eliminar pruebas → publicar/entregar.

No existen cortes estadísticos permanentes ni un mecanismo de “reset_at”. La limpieza previa a la entrega se realiza eliminando los registros de prueba.
