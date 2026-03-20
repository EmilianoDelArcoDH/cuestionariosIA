## Cuestionarios IA - Plataforma de evaluación híbrida

Este proyecto es un MVP de una plataforma para crear, administrar y resolver cuestionarios educativos con evaluación híbrida (reglas + IA) para respuestas abiertas.

### Stack principal

- Next.js 14 (App Router) + React + TypeScript
- PostgreSQL + Prisma ORM
- Motor de evaluación desacoplado en `lib/evaluation`

### Flujo de evaluación

- **Capa 1 (reglas)**: `ruleBasedValidator` aplica validaciones determinísticas (longitud, conceptos obligatorios, estructura HTML básica, regex opcional).
- **Capa 2 (IA)**: `aiEvaluator` usa por ahora un proveedor mock heurístico, preparado para conectar OpenAI/Groq/Ollama.
- **Capa 3 (scoring)**: `scoring.combineResults` fusiona los resultados y calcula score final, resultado (correcto / parcial / incorrecto) y recomendación de revisión.
- **Orquestación**: `evaluationEngine.evaluateAnswer` expone una función única para evaluar respuestas.

### Ejemplo funcional

Hay un ejemplo funcional en la ruta:

- API: `POST /api/evaluate-example` con `{ "answer": "..." }`
- UI: página de inicio (`/`) con un textarea que envía una respuesta a la pregunta sobre la etiqueta `<a>` en HTML y muestra el JSON de evaluación.

### Próximos pasos

- Añadir autenticación y roles (Admin, Docente, Alumno).
- Implementar CRUD de cursos, cuestionarios y preguntas usando el `schema.prisma`.
- Conectar el motor de evaluación a los modelos `Question`, `Answer` y `EvaluationResult`.

