// gunnchAI3k Study Copilot v2 - Main Integration
// Exports all study copilot functionality

export * from './ingest';
export * from './plan';
export * from './exporters/pptx';
export * from './exporters/docx';
export * from './exporters/pdf';
export * from './bot';
export * from './storage';

// Main study copilot class
export class StudyCopilot {
  private bot: any;
  private storage: any;
  
  constructor(discordClient: any, storageConfig?: any) {
    this.bot = new (require('./bot').StudyCopilotBot)(discordClient);
    this.storage = require('./storage').createStorage(storageConfig);
  }
  
  async handleInteraction(interaction: any) {
    return this.bot.handleInteraction(interaction);
  }
  
  async generateStudyPack(
    courseName: string,
    files: { syllabus?: Buffer; assignment?: Buffer; lecture?: Buffer },
    preferences?: any
  ) {
    const { ingestFiles } = require('./ingest');
    const { makeStudyPlan } = require('./plan');
    const { toPPTX } = require('./exporters/pptx');
    const { toDOCX } = require('./exporters/docx');
    const { toPDF } = require('./exporters/pdf');
    
    // Ingest files
    const courseModel = await ingestFiles(courseName, files);
    
    // Create study plan
    const studyPlan = makeStudyPlan(courseModel, preferences || {
      hoursPerWeek: 10,
      sessionLength: 50
    });
    
    // Generate materials
    const [pptxBuffer, docxBuffer, pdfBuffer] = await Promise.all([
      toPPTX(courseModel, studyPlan, courseName),
      toDOCX(courseModel, studyPlan, courseName),
      toPDF(courseModel, studyPlan, courseName)
    ]);
    
    return {
      courseModel,
      studyPlan,
      materials: {
        pptx: pptxBuffer,
        docx: docxBuffer,
        pdf: pdfBuffer
      }
    };
  }
}

// Utility functions
export const StudyUtils = {
  formatTime: (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  },
  
  getDifficultyColor: (difficulty: string): string => {
    switch (difficulty) {
      case 'easy': return '#27AE60';
      case 'medium': return '#F39C12';
      case 'hard': return '#E74C3C';
      default: return '#7F8C8D';
    }
  },
  
  getActivityIcon: (activity: string): string => {
    switch (activity) {
      case 'study': return '📚';
      case 'retrieval': return '🧠';
      case 'practice': return '✏️';
      case 'review': return '🔄';
      default: return '📝';
    }
  },
  
  formatFileSize: (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
};

// Study strategies based on learning science
export const StudyStrategies = {
  spacedRetrieval: {
    name: 'Spaced Retrieval',
    description: 'Test yourself at increasing intervals to strengthen memory',
    intervals: [1, 3, 7, 14, 30], // days
    benefits: ['Improved retention', 'Long-term learning', 'Reduced forgetting']
  },
  
  interleaving: {
    name: 'Interleaving',
    description: 'Mix different topics and problem types during practice',
    benefits: ['Better discrimination', 'Improved transfer', 'Enhanced problem-solving']
  },
  
  workedExamples: {
    name: 'Worked Examples',
    description: 'Study complete solutions before attempting problems',
    benefits: ['Reduced cognitive load', 'Faster skill acquisition', 'Better understanding']
  },
  
  retrievalPractice: {
    name: 'Retrieval Practice',
    description: 'Test your memory without looking at materials',
    benefits: ['Stronger memory traces', 'Better long-term retention', 'Improved confidence']
  }
};

// Learning science references
export const LearningScience = {
  testingEffect: {
    title: 'The Testing Effect',
    description: 'Retrieval practice produces better long-term retention than restudying',
    reference: 'Roediger & Karpicke (2006)',
    application: 'Use flashcards, practice tests, and self-quizzing'
  },
  
  spacingEffect: {
    title: 'The Spacing Effect',
    description: 'Distributed practice is more effective than massed practice',
    reference: 'Cepeda et al. (2006)',
    application: 'Review material at increasing intervals'
  },
  
  interleavingEffect: {
    title: 'The Interleaving Effect',
    description: 'Mixing different types of problems improves learning',
    reference: 'Rohrer & Taylor (2007)',
    application: 'Practice different topics together, not in isolation'
  },
  
  workedExamples: {
    title: 'Worked Examples',
    description: 'Studying complete solutions reduces cognitive load',
    reference: 'Sweller & Cooper (1985)',
    application: 'Study examples before attempting problems'
  }
};

