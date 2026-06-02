export type SeedQuestionInput =
  | {
      text: string;
      type: 'open';
      modelAnswer: string;
      keyConcepts: string[];
      expectedExpressions: string[];
    }
  | {
      text: string;
      type: 'single' | 'multiple';
      options: string[];
      correctAnswers: string[];
    };

export type SeedQuestionnaire = {
  title: string;
  description: string;
  questions: SeedQuestionInput[];
};

export const seedQuestionnaires: SeedQuestionnaire[] = [
  {
    title: 'HTML Basico',
    description: 'Preguntas sobre etiquetas y enlaces.',
    questions: [
      {
        text: 'Que es una etiqueta <a> en HTML y para que sirve?',
        type: 'open',
        modelAnswer:
          'Una etiqueta ancla se compone de apertura <a>, cierre </a> y puede incluir href para definir el destino.',
        keyConcepts: ['etiqueta ancla', 'apertura', 'cierre', 'href'],
        expectedExpressions: ['<a>', '</a>', 'href']
      },
      {
        text: 'Cual de estas etiquetas es para enlaces?',
        type: 'single',
        options: ['<div>', '<a>', '<span>'],
        correctAnswers: ['<a>']
      },
      {
        text: 'Selecciona todas las etiquetas validas para enlaces.',
        type: 'multiple',
        options: ['<a>', '<link>', '<button>', '<area>'],
        correctAnswers: ['<a>', '<area>']
      }
    ]
  },
  {
    title: 'CSS Avanzado',
    description: 'Preguntas sobre estilos y layout.',
    questions: [
      {
        text: 'Que es una clase en CSS?',
        type: 'open',
        modelAnswer:
          'Una clase en CSS es un selector reutilizable que permite aplicar estilos a varios elementos.',
        keyConcepts: ['selector', 'reutilizable', 'estilos'],
        expectedExpressions: ['.', 'selector', 'estilos']
      },
      {
        text: 'Cual es la propiedad para color de fondo?',
        type: 'single',
        options: ['background-color', 'color', 'border'],
        correctAnswers: ['background-color']
      },
      {
        text: 'Selecciona todas las propiedades de layout.',
        type: 'multiple',
        options: ['display', 'position', 'margin', 'padding'],
        correctAnswers: ['display', 'position']
      }
    ]
  },
  {
    title: 'JavaScript Fundamentos',
    description: 'Preguntas sobre variables y funciones.',
    questions: [
      {
        text: 'Que es una variable en JavaScript?',
        type: 'open',
        modelAnswer:
          'Una variable es un espacio con nombre para almacenar datos que pueden utilizarse y cambiarse durante la ejecucion.',
        keyConcepts: ['almacenar datos', 'nombre', 'valor'],
        expectedExpressions: ['let', 'const', 'valor']
      },
      {
        text: 'Cual es el operador para asignacion?',
        type: 'single',
        options: ['=', '+', '=='],
        correctAnswers: ['=']
      },
      {
        text: 'Selecciona todos los tipos de datos validos.',
        type: 'multiple',
        options: ['string', 'number', 'boolean', 'array', 'object'],
        correctAnswers: ['string', 'number', 'boolean', 'object']
      }
    ]
  },
  {
    "title": "Control de versiones con Git",
    "description": "Cuestionario sobre control de versiones, Git, commits, historial e iteraciones.",
    "questions": [
      {
        "text": "¿Qué es el control de versiones?",
        "type": "single",
        "options": [
          "Un programa para diseñar páginas web",
          "Un sistema que registra los cambios hechos a un conjunto de archivos a lo largo del tiempo",
          "Una carpeta donde se guardan copias de seguridad",
          "Una red social para programadores"
        ],
        "correctAnswers": [
          "Un sistema que registra los cambios hechos a un conjunto de archivos a lo largo del tiempo"
        ]
      },
      {
        "text": "Según las clases, ¿qué guarda Git en realidad?",
        "type": "single",
        "options": [
          "Copias completas de todo el proyecto en cada versión",
          "Solo el último archivo modificado",
          "Las diferencias respecto a la versión anterior",
          "Únicamente los mensajes de commit"
        ],
        "correctAnswers": [
          "Las diferencias respecto a la versión anterior"
        ]
      },
      {
        "text": "¿Cuál es la diferencia entre Git y GitHub?",
        "type": "single",
        "options": [
          "Son exactamente lo mismo",
          "Git es la herramienta que vive en tu computadora; GitHub es una plataforma en internet para compartir proyectos",
          "Git es online y GitHub es offline",
          "GitHub es el motor y Git es la red social del código"
        ],
        "correctAnswers": [
          "Git es la herramienta que vive en tu computadora; GitHub es una plataforma en internet para compartir proyectos"
        ]
      },
      {
        "text": "¿Qué comando convierte una carpeta común en un repositorio?",
        "type": "single",
        "options": [
          "git start",
          "git commit",
          "git init",
          "git status"
        ],
        "correctAnswers": [
          "git init"
        ]
      },
      {
        "text": "¿Qué crea git init dentro del proyecto?",
        "type": "single",
        "options": [
          "Una carpeta visible llamada 'historial'",
          "Una carpeta oculta llamada .git donde Git guarda toda la historia",
          "Un archivo de texto con los cambios",
          "Una copia del proyecto en la nube"
        ],
        "correctAnswers": [
          "Una carpeta oculta llamada .git donde Git guarda toda la historia"
        ]
      },
      {
        "text": "¿Cuáles son los tres estados de un archivo en Git?",
        "type": "single",
        "options": [
          "Nuevo, viejo, borrado",
          "Modificado, preparado, confirmado",
          "Local, remoto, compartido",
          "Abierto, cerrado, guardado"
        ],
        "correctAnswers": [
          "Modificado, preparado, confirmado"
        ]
      },
      {
        "text": "¿Para qué sirve el staging area (área de preparados)?",
        "type": "single",
        "options": [
          "Es un trámite obligatorio sin función real",
          "Para guardar el proyecto en internet",
          "Para elegir exactamente qué cambios entran en cada commit",
          "Para borrar archivos del proyecto"
        ],
        "correctAnswers": [
          "Para elegir exactamente qué cambios entran en cada commit"
        ]
      },
      {
        "text": "¿Qué hace git add .?",
        "type": "single",
        "options": [
          "Crea un commit con un mensaje automático",
          "Prepara todos los archivos que cambiaron en la carpeta",
          "Borra todos los cambios",
          "Sube los archivos a GitHub"
        ],
        "correctAnswers": [
          "Prepara todos los archivos que cambiaron en la carpeta"
        ]
      },
      {
        "text": "¿Cuál es la diferencia entre guardar un archivo (Ctrl+S) y hacer un commit?",
        "type": "single",
        "options": [
          "No hay diferencia, son lo mismo",
          "Ctrl+S sube a internet y commit guarda localmente",
          "Guardar le dice al editor que no pierda lo escrito; el commit le dice a Git que ese cambio merece quedar en la historia",
          "El commit guarda el archivo y Ctrl+S lo registra en Git"
        ],
        "correctAnswers": [
          "Guardar le dice al editor que no pierda lo escrito; el commit le dice a Git que ese cambio merece quedar en la historia"
        ]
      },
      {
        "text": "¿Cuál de estos es un buen mensaje de commit?",
        "type": "single",
        "options": [
          "cambios",
          "asdfgh",
          "Corrige el enlace roto en el menú de navegación",
          "fix"
        ],
        "correctAnswers": [
          "Corrige el enlace roto en el menú de navegación"
        ]
      },
      {
        "text": "¿Qué comando se usa para ver el estado actual del proyecto?",
        "type": "single",
        "options": [
          "git log",
          "git status",
          "git diff",
          "git show"
        ],
        "correctAnswers": [
          "git status"
        ]
      },
      {
        "text": "¿Qué es el hash de un commit?",
        "type": "single",
        "options": [
          "El mensaje que describe el cambio",
          "Un identificador único que funciona como el DNI de esa versión",
          "El nombre del autor del commit",
          "La fecha en que se hizo el commit"
        ],
        "correctAnswers": [
          "Un identificador único que funciona como el DNI de esa versión"
        ]
      },
      {
        "text": "¿Qué comando muestra el historial completo de commits?",
        "type": "single",
        "options": [
          "git history",
          "git status",
          "git log",
          "git init"
        ],
        "correctAnswers": [
          "git log"
        ]
      },
      {
        "text": "¿Qué muestra git log --oneline?",
        "type": "single",
        "options": [
          "Solo el primer commit del proyecto",
          "Una versión resumida: el hash corto y el mensaje de cada commit",
          "Las diferencias entre dos archivos",
          "El estado actual del proyecto"
        ],
        "correctAnswers": [
          "Una versión resumida: el hash corto y el mensaje de cada commit"
        ]
      },
      {
        "text": "Por defecto, ¿qué compara git diff?",
        "type": "single",
        "options": [
          "Dos repositorios distintos",
          "Lo que modificamos con el último commit",
          "Dos ramas diferentes",
          "El proyecto local con el de GitHub"
        ],
        "correctAnswers": [
          "Lo que modificamos con el último commit"
        ]
      },
      {
        "text": "¿Qué significa volver a un estado anterior en Git?",
        "type": "single",
        "options": [
          "Borrar definitivamente toda la historia posterior",
          "Moverse dentro de la historia sin borrarla",
          "Eliminar el repositorio",
          "Crear un proyecto nuevo desde cero"
        ],
        "correctAnswers": [
          "Moverse dentro de la historia sin borrarla"
        ]
      },
      {
        "text": "¿Qué es el 'debugging histórico'?",
        "type": "single",
        "options": [
          "Adivinar dónde está el error sin mirar nada",
          "Usar el historial (git log, git diff, git show) para investigar cuándo y por qué se rompió algo",
          "Borrar los commits con errores",
          "Reescribir todo el código desde el principio"
        ],
        "correctAnswers": [
          "Usar el historial (git log, git diff, git show) para investigar cuándo y por qué se rompió algo"
        ]
      },
      {
        "text": "En la entrega versionada, ¿qué se evalúa principalmente?",
        "type": "single",
        "options": [
          "La cantidad de commits",
          "La comprensión del proceso, no la cantidad de commits",
          "Tener más de 50 commits",
          "La velocidad con la que se hizo el proyecto"
        ],
        "correctAnswers": [
          "La comprensión del proceso, no la cantidad de commits"
        ]
      },
      {
        "text": "¿Qué es una iteración en un proyecto?",
        "type": "single",
        "options": [
          "Un commit suelto cualquiera",
          "Un conjunto de commits que juntos forman un avance significativo y completo",
          "Un error en el código",
          "Una copia de seguridad del proyecto"
        ],
        "correctAnswers": [
          "Un conjunto de commits que juntos forman un avance significativo y completo"
        ]
      },
      {
        "text": "Según las clases, ¿por qué importa un historial claro al trabajar en equipo?",
        "type": "single",
        "options": [
          "Porque ocupa menos espacio en disco",
          "Porque funciona como documentación automática que permite a cualquiera entender qué se hizo sin preguntar",
          "Porque hace que el código corra más rápido",
          "Porque es obligatorio para que Git funcione"
        ],
        "correctAnswers": [
          "Porque funciona como documentación automática que permite a cualquiera entender qué se hizo sin preguntar"
        ]
      }
    ]
  }

];