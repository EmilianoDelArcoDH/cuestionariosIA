# Validación de calidad de evaluaciones

Se probaron 8 respuestas sintéticas sobre 5 preguntas reales de la base de datos, con el prompt actual de producción. No se usaron respuestas de alumnos ni se modificó la base. Los rangos esperados se fijaron antes de las llamadas; son criterios de esta revisión, no notas validadas por un docente.

| Caso | Gemini | Groq | Rango esperado |
|---|---:|---:|---:|
| correcta (pregunta 1) | 100 | 100 | 90–100 |
| parcial (pregunta 1) | 40 | 35 | 35–85 |
| incorrecta (pregunta 1) | 0 | 0 | 0–25 |
| parafrasis correcta (pregunta 4) | 95 | 90 | 85–100 |
| incorrecta con palabras clave (pregunta 7) | 0 | 5 | 0–25 |
| intento de manipular nota (pregunta 7) | 0 | 0 | 0–10 |
| tema concreto valido (pregunta 39) | Error 503 | 90 | 85–100 |
| objetivo concreto valido (pregunta 40) | 90 | 65 | 85–100 |

## Hallazgos

- Groq respondió en 8/8 casos; 7/8 puntajes quedaron dentro del rango esperado. Gemini respondió en 7/8; los 7 puntajes quedaron dentro del rango. Hubo un HTTP 503 real. No son tasas de disponibilidad general.
- Todas las devoluciones obtenidas se relacionaron con su pregunta. Ambos modelos rechazaron errores conceptuales pese a contener palabras clave y rechazaron el intento de manipular la nota.
- Fallo significativo: pregunta 40, objetivo de un tutorial sobre reparar una pinchadura. Gemini asignó 90; Groq 65, por no mencionar tipos, equipamiento y palabras exactas de una referencia genérica. Con el umbral 70, el mismo caso cambia de aprobado a desaprobado. La pregunta no exige esos detalles.
- Groq también descontó por omitir vocabulario literal en CSS y en la temática del tutorial, pese a reconocer que el significado era correcto.

## Dictamen

La pertinencia está comprobada para esta muestra, pero la equivalencia de calificación entre proveedores no está validada: se encontró un cambio injustificado de aprobación. Antes de considerar intercambiables los proveedores, definir una rúbrica que priorice significado, no exija términos literales salvo que la pregunta lo requiera y distinga ejemplos orientativos de requisitos obligatorios. Repetir con una muestra mayor y notas de referencia del docente.

Esta revisión no cambia el prompt ni los criterios de producción. Una ejecución por proveedor y caso no mide repetibilidad, otros idiomas ni otros contenidos. Las 16 llamadas se hicieron separadamente para comparar proveedores; el 503 no se presenta como una prueba nueva de alternancia automática.

Las respuestas completas y tiempos se conservan en `evaluation-quality-results.json`.

## Ajuste aplicado tras la revisión

Se centralizó la consigna en `lib/evaluationPrompt.ts` para ambos proveedores.
Ahora la pregunta define los requisitos; la referencia es orientativa. Se aceptan
paráfrasis y propuestas personales válidas y los detalles opcionales no reducen
la nota. Los descuentos deben justificarse con errores u omisiones exigidas por
el enunciado. Se mantienen las penalizaciones por errores conceptuales y por
respuestas ajenas a la pregunta.

Se repitieron cinco casos con ambos proveedores tras el primer ajuste: Groq
respondió los cinco y Gemini tres (dos tiempos de espera agotados). CSS y tema
del tutorial obtuvieron 100 con ambos. Groq siguió dando 0 a errores conceptuales
y ambos dieron 0 al intento de manipular la nota. El objetivo del tutorial subió
de 65 a 85 con Groq, pero su explicación aún mencionaba detalles opcionales.

Por eso se reforzó la regla: una respuesta completa y sin errores recibe 100 y
cualquier descuento debe justificarse por lo que pide la pregunta. Con esta
versión final, el caso problemático del objetivo del tutorial obtuvo 100 en una
nueva llamada real a Groq, sin observaciones por palabras o detalles ausentes.
Ver `evaluation-quality-adjusted-results.json` y
`evaluation-quality-final-check.json`. La versión final tuvo esa comprobación
puntual; la muestra sigue siendo limitada y no garantiza consistencia universal.
