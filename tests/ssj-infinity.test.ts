import { SSJInfinity } from '../src/study/ssj-infinity';

// Mock CourseMaterialIntegration
const mockCourseIntegration = {
  loadCourseMaterials: jest.fn().mockResolvedValue([]),
  generateStudyMaterials: jest.fn().mockResolvedValue({
    materials: [],
    topics: [],
    flashcards: [],
    practiceProblems: [],
    studyGuide: ''
  })
};

describe('SSJInfinity', () => {
  let ssjInfinity: SSJInfinity;

  beforeEach(() => {
    jest.clearAllMocks();
    const mockClient = { on: jest.fn(), once: jest.fn() };
    ssjInfinity = new SSJInfinity(mockClient as any);
  });

  describe('Flashcard Request Detection', () => {
    it('should detect flashcard requests', () => {
      const flashcardMessages = [
        'flashcards',
        'flash cards',
        'study cards',
        'make flashcards'
      ];

      flashcardMessages.forEach(message => {
        const result = (ssjInfinity as any).isFlashcardRequest(message);
        expect(result).toBe(true);
      });
    });

    it('should not detect non-flashcard requests', () => {
      const nonFlashcardMessages = [
        'hello world',
        'play music',
        'help me study',
        'what can you do'
      ];

      nonFlashcardMessages.forEach(message => {
        const result = (ssjInfinity as any).isFlashcardRequest(message);
        expect(result).toBe(false);
      });
    });
  });

  describe('Practice Test Request Detection', () => {
    it('should detect practice test requests', () => {
      const practiceTestMessages = [
        'practice test',
        'practice exam',
        'mock test',
        'sample test'
      ];

      practiceTestMessages.forEach(message => {
        const result = (ssjInfinity as any).isPracticeTestRequest(message);
        expect(result).toBe(true);
      });
    });
  });

  describe('Weekly Assessment Request Detection', () => {
    it('should detect weekly assessment requests', () => {
      const assessmentMessages = [
        'weekly assessment',
        'knowledge check',
        'weekly review',
        'assessment'
      ];

      assessmentMessages.forEach(message => {
        const result = (ssjInfinity as any).isWeeklyAssessmentRequest(message);
        expect(result).toBe(true);
      });
    });
  });

  describe('Study Help Request Detection', () => {
    it('should detect study help requests', () => {
      const studyHelpMessages = [
        'help me study',
        'study help',
        'help with studying',
        'study assistance'
      ];

      studyHelpMessages.forEach(message => {
        const result = (ssjInfinity as any).isStudyHelpRequest(message);
        expect(result).toBe(true);
      });
    });
  });

  describe('Lock-In Request Detection', () => {
    it('should detect lock-in requests', () => {
      const lockInMessages = [
        'lock me in',
        'lock in mode',
        'academic warrior',
        'focus mode'
      ];

      lockInMessages.forEach(message => {
        const result = (ssjInfinity as any).isLockInRequest(message);
        expect(result).toBe(true);
      });
    });
  });

  describe('Empathetic Response Generation', () => {
    it('should generate empathetic responses', () => {
      const mockMessage = {
        author: {
          id: 'test_user',
          username: 'testuser'
        },
        content: 'I need help studying'
      };

      const response = (ssjInfinity as any).generateEmpatheticResponse('help studying', mockMessage.author);
      expect(response).toContain('testuser');
      expect(response).toContain('help');
    });
  });

  describe('Mention Processing', () => {
    it('should process mentions and return responses', async () => {
      const mockMessage = {
        author: {
          id: 'test_user',
          username: 'testuser'
        },
        content: 'flashcards for probability',
        reply: jest.fn().mockResolvedValue(undefined),
      };

      const response = await ssjInfinity.processMention(mockMessage as any);
      expect(response === null || typeof response === 'string').toBe(true);
    });

    it('should handle midterm-specific requests', async () => {
      const mockMessage = {
        author: {
          id: 'test_user',
          username: 'testuser'
        },
        content: 'midterm exam prep'
      };

      const response = await ssjInfinity.processMention(mockMessage as any);
      expect(response).toContain('MIDTERM MODE ACTIVATED');
    });

    it('should handle probability-specific requests', async () => {
      const mockMessage = {
        author: {
          id: 'test_user',
          username: 'testuser'
        },
        content: 'probability concepts'
      };

      const response = await ssjInfinity.processMention(mockMessage as any);
      expect(response).toContain('PROBABILITY MODE ACTIVATED');
    });

    it('should handle robotics-specific requests', async () => {
      const mockMessage = {
        author: {
          id: 'test_user',
          username: 'testuser'
        },
        content: 'robotics chapters'
      };

      const response = await ssjInfinity.processMention(mockMessage as any);
      expect(response).toContain('ROBOTICS MODE ACTIVATED');
    });
  });
});





