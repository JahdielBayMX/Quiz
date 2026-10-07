ESTADÍSTICAS — FASE 2

Objetivo:
Guardar de forma centralizada los resultados de los quizzes.

ARQUITECTURA
Quiz en navegador
  -> /api/quiz-completed (Vercel)
  -> Supabase RPC
  -> quiz_attempts + quiz_answers

SUPABASE
Esta fase usa Supabase como almacenamiento central porque proporciona PostgreSQL y una API REST adecuada para el entorno serverless. El endpoint de Vercel mantiene la clave secreta fuera del navegador.

PASOS
1. Crear un proyecto en Supabase.
2. Abrir SQL Editor.
3. Ejecutar statistics/schema.sql completo.
4. En Vercel, agregar estas variables de entorno:
   SUPABASE_URL = URL del proyecto Supabase
   SUPABASE_SERVICE_ROLE_KEY = clave secreta del proyecto
5. Aplicar las variables a Production y hacer un nuevo deploy.
6. Abrir un quiz publicado y terminarlo.
7. Verificar que aparezca un registro en Table Editor > quiz_attempts y sus respuestas en quiz_answers.

SEGURIDAD
- SUPABASE_SERVICE_ROLE_KEY nunca se incluye en el navegador ni en GitHub.
- Las tablas tienen Row Level Security habilitado.
- No se crean políticas públicas de lectura/escritura.
- El endpoint valida la estructura básica antes de enviar el evento.
- El attemptId evita duplicar el mismo intento.
- No se recopilan datos personales del participante.

COMPORTAMIENTO
Si Supabase no está configurado o está temporalmente indisponible, el quiz continúa funcionando. El almacenamiento de estadísticas falla de forma silenciosa para el participante y se registra el problema en el servidor.

PRUEBA RÁPIDA
Después de configurar Supabase y Vercel:
- completar un quiz una vez;
- revisar quiz_attempts: debe existir 1 intento;
- revisar quiz_answers: debe existir 1 fila por pregunta.

SIGUIENTE FASE
Fase 3: estadísticas básicas y consultas agregadas. Todavía no incluye panel administrativo.
