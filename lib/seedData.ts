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
  }
];
