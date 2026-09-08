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


### Respaldo gratuito de evaluaciones con Groq

Configurar en `.env` (raíz del proyecto):

```dotenv
GEMINI_API_KEY="tu_clave_gemini"
GROQ_API_KEY="tu_clave_groq"
GROQ_MODEL="openai/gpt-oss-120b"
```

Crear la clave de Groq en https://console.groq.com/keys usando el plan gratuito.
La integración no activa facturación ni cambia el plan de las cuentas.
Reiniciar el servidor después de actualizar las variables; en el alojamiento,
configurarlas también como variables del servidor y volver a desplegar.

Para preguntas abiertas se intenta Gemini primero. Si falla, agota su cuota,
no responde en 30 segundos o devuelve una evaluación sin puntaje válido, se
intenta Groq con la misma consigna. Con Groq configurado no se repite la llamada
fallida de Gemini. Sin clave de Gemini se puede evaluar directamente con Groq.
Si ambos fallan, la evaluación queda pendiente y no se calcula una nota parcial.
Ambos planes gratuitos tienen límites; este respaldo no proporciona uso ilimitado.
Los registros del servidor indican el proveedor que falló sin guardar claves ni
respuestas de alumnos. La traducción de cuestionarios sigue usando Gemini.

Verificación (Node.js 24): `node --experimental-strip-types --test tests/*.test.mjs`.
