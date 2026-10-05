QUIZ PLATFORM — FASE 10

Novedades
- URLs públicas usan el slug del cliente, no el ID interno.
- Cliente: clients/{client-slug}.json
- Quizzes: quizzes/{client-slug}/{año}/{mes}/{quiz-slug}.json
- Nueva pantalla de resultado compartible en /share/{client-slug}/{año}/{mes}/{quiz-slug}
- La pantalla compartida muestra porcentaje, respuestas, mensaje y botón para volver al quiz.
- Las redes reciben una URL de compartir dedicada y metadatos Open Graph/Twitter.
- El mensaje de compartir está orientado al discipulado: recordar la predicación y mantener vivo el mensaje durante la semana, no competir.

Ejemplo
/quiz/iglesia-comunidad-de-gracia/2026/10-octubre/sabiduria
/share/iglesia-comunidad-de-gracia/2026/10-octubre/sabiduria?score=8&total=10&percent=80

Cliente
{
  "id": "cliente-001",
  "slug": "iglesia-comunidad-de-gracia",
  "name": "Iglesia Comunidad de Gracia",
  "status": "active"
}

IMPORTANTE
- El id sigue siendo interno.
- El slug es público y debe ser único.
- Para un nuevo cliente, crear un JSON en clients/ y su carpeta correspondiente en quizzes/.
- La pantalla compartida no verifica el resultado contra una base de datos; por ahora el resultado es un dato de presentación. Una futura fase con base de datos podrá reemplazar score/total por un ID de resultado.
