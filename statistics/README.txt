ESTADÍSTICAS V1

OBJETIVO
Guardar y analizar los resultados de los quizzes sin recopilar datos personales.

ARQUITECTURA
Quiz en navegador
  -> /api/quiz-completed (Vercel)
  -> Supabase
  -> /statistics/ (panel privado)

CONFIGURACIÓN
1. Crear un proyecto en Supabase.
2. Abrir SQL Editor.
3. Ejecutar statistics/schema.sql completo.
4. En Vercel configurar:
   SUPABASE_URL = URL del proyecto Supabase
   SUPABASE_SERVICE_ROLE_KEY = clave secreta del proyecto
   STATS_DASHBOARD_KEY = clave privada del panel
5. Aplicar las variables a Production y hacer un nuevo deploy.

PANEL
Ruta: /statistics/

Incluye:
- acceso privado mediante STATS_DASHBOARD_KEY;
- filtros por cliente, quiz, año y mes;
- relación Cliente → Quiz;
- métricas por quiz: Intentos, Aciertos, Errores y Promedio;
- promedio real de los porcentajes de los intentos;
- análisis de errores por pregunta;
- identificación de la pregunta con más errores;
- exportación CSV;
- modo oscuro;
- Actualizar y Salir.

LIMPIEZA DE PRUEBAS
Antes de entregar un quiz a un cliente:
1. Completar las pruebas necesarias.
2. Revisar los resultados en /statistics/.
3. Usar Administración de pruebas para eliminar:
   - el quiz seleccionado;
   - el cliente seleccionado;
   - o todas las pruebas.
4. Confirmar que los registros de pruebas desaparecieron.

La eliminación de un quiz exige el cliente seleccionado y se filtra por ambos valores (client_slug + quiz_slug), evitando mezclar clientes con slugs iguales.

SEGURIDAD
- SUPABASE_SERVICE_ROLE_KEY nunca se incluye en el navegador ni en GitHub.
- Las tablas tienen Row Level Security habilitado.
- No se crean políticas públicas de lectura/escritura.
- El panel requiere STATS_DASHBOARD_KEY.
- No se recopilan datos personales del participante.

COMPORTAMIENTO DEL QUIZ
Si Supabase no está configurado o está temporalmente indisponible, el quiz continúa funcionando. El almacenamiento de estadísticas falla de forma silenciosa para el participante y se registra el problema en el servidor.

OPERACIÓN
Crear cliente → crear quiz → probar → revisar estadísticas → eliminar pruebas → publicar/entregar.

IMPORTANTE
No se utilizan cortes estadísticos ni reset_at. La limpieza de pruebas es administrativa y elimina los registros de quiz_attempts y sus quiz_answers.
