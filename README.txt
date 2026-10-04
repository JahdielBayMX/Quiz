QUIZ PLATFORM

Estructura actual:
/quizzes/<cliente>/<año>/<mes>/<slug>.json

Ruta pública:
/quiz/<cliente>/<año>/<mes>/<slug>

Cada JSON contiene:
- client.id
- client.name
- period.year
- period.month
- quiz.id
- quiz.slug
- configuración del quiz
- questions

Para agregar un quiz nuevo solo se crea el JSON en la carpeta del cliente/período correspondiente.
Para agregar un cliente nuevo se crea su carpeta y se usan sus datos de client.id y client.name en los JSON.

IMPORTANTE: "Cliente 001" es un identificador de ejemplo. Sustituir client.id y client.name por los datos reales antes de publicar los quizzes del cliente.

FASE 5 - COMPARTIR RESULTADO
Al finalizar el quiz se muestran opciones para compartir mediante el menú nativo del dispositivo, WhatsApp, Facebook, X o copiar el texto del resultado. Los enlaces compartidos incluyen la URL completa del quiz. En Facebook/X, la red puede mostrar la vista previa según los metadatos y sus propias políticas.
