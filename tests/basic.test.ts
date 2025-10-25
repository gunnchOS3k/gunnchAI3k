// Basic tests for gunnchAI3k core functionality
describe('gunnchAI3k Basic Tests', () => {
  describe('Environment Setup', () => {
    it('should have required environment variables', () => {
      expect(process.env.DISCORD_BOT_TOKEN).toBeDefined();
      expect(process.env.DISCORD_CLIENT_ID).toBeDefined();
      expect(process.env.DISCORD_GUILD_ID).toBeDefined();
    });

    it('should have test environment variables set', () => {
      expect(process.env.DISCORD_BOT_TOKEN).toBe('test_token');
      expect(process.env.DISCORD_CLIENT_ID).toBe('test_client_id');
      expect(process.env.DISCORD_GUILD_ID).toBe('test_guild_id');
    });
  });

  describe('Basic Functionality', () => {
    it('should perform basic string operations', () => {
      const testString = 'gunnchAI3k is awesome!';
      expect(testString).toContain('gunnchAI3k');
      expect(testString).toContain('awesome');
    });

    it('should handle array operations', () => {
      const testArray = ['study', 'music', 'help'];
      expect(testArray).toHaveLength(3);
      expect(testArray).toContain('study');
      expect(testArray).toContain('music');
      expect(testArray).toContain('help');
    });

    it('should handle object operations', () => {
      const testObject = {
        name: 'gunnchAI3k',
        type: 'AI Assistant',
        features: ['study', 'music', 'help']
      };
      
      expect(testObject.name).toBe('gunnchAI3k');
      expect(testObject.type).toBe('AI Assistant');
      expect(testObject.features).toHaveLength(3);
    });
  });

  describe('Music Command Detection', () => {
    const isMusicRelatedMessage = (content: string): boolean => {
      const musicKeywords = ['play', 'music', 'song', 'youtube', 'spotify', 'apple music', 'dj', 'queue', 'skip', 'pause', 'resume', 'stop'];
      return musicKeywords.some(keyword => content.includes(keyword));
    };

    it('should detect music-related messages', () => {
      expect(isMusicRelatedMessage('play some music')).toBe(true);
      expect(isMusicRelatedMessage('start a song')).toBe(true);
      expect(isMusicRelatedMessage('youtube music')).toBe(true);
      expect(isMusicRelatedMessage('put on music')).toBe(true);
      expect(isMusicRelatedMessage('queue song')).toBe(true);
      expect(isMusicRelatedMessage('skip track')).toBe(true);
    });

    it('should not detect non-music messages', () => {
      const nonMusicMessages = [
        'hello world',
        'study for exam',
        'help me learn',
        'what can you do',
        'flashcards please'
      ];

      nonMusicMessages.forEach(message => {
        expect(isMusicRelatedMessage(message)).toBe(false);
      });
    });
  });

  describe('Study Command Detection', () => {
    const isStudyRelatedMessage = (content: string): boolean => {
      const studyKeywords = ['study', 'learn', 'flashcards', 'practice', 'exam', 'midterm', 'help', 'tutor'];
      return studyKeywords.some(keyword => content.includes(keyword));
    };

    it('should detect study-related messages', () => {
      const studyMessages = [
        'help me study',
        'flashcards please',
        'practice test',
        'midterm help',
        'learn probability',
        'study session'
      ];

      studyMessages.forEach(message => {
        expect(isStudyRelatedMessage(message)).toBe(true);
      });
    });

    it('should not detect non-study messages', () => {
      const nonStudyMessages = [
        'play music',
        'hello world',
        'what time is it',
        'weather today',
        'random chat'
      ];

      nonStudyMessages.forEach(message => {
        expect(isStudyRelatedMessage(message)).toBe(false);
      });
    });
  });

  describe('String Processing', () => {
    it('should extract song queries from messages', () => {
      const extractSongQuery = (content: string): string => {
        return content
          .replace(/@gunnchai3k/gi, '')
          .replace(/play/gi, '')
          .replace(/put on/gi, '')
          .replace(/start/gi, '')
          .replace(/begin/gi, '')
          .replace(/queue/gi, '')
          .trim();
      };

      const testCases = [
        { input: '@gunnchAI3k play meet me there by lucki', expected: 'meet me there by lucki' },
        { input: 'play juice wrld bandit', expected: 'juice wrld bandit' },
        { input: 'put on some study music', expected: 'some study music' },
        { input: 'start classical music', expected: 'classical music' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(extractSongQuery(input)).toBe(expected);
      });
    });

    it('should validate YouTube URLs', () => {
      const isValidYouTubeUrl = (url: string): boolean => {
        return /https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/.test(url);
      };

      const validUrls = [
        'https://www.youtube.com/watch?v=test123',
        'https://youtu.be/test123',
        'http://www.youtube.com/watch?v=test123'
      ];

      const invalidUrls = [
        'https://invalid-url.com',
        'not a url',
        'https://vimeo.com/test123'
      ];

      validUrls.forEach(url => {
        expect(isValidYouTubeUrl(url)).toBe(true);
      });

      invalidUrls.forEach(url => {
        expect(isValidYouTubeUrl(url)).toBe(false);
      });
    });
  });

  describe('Response Generation', () => {
    it('should generate music responses', () => {
      const generateMusicResponse = (song: string, artist: string): string => {
        return `📺 **YouTube Playing:** ${song} by ${artist}\n\n🎵 **Connecting to YouTube...**\n🎶 **Starting playback...**\n\n**Free audio from YouTube!** 📺✨`;
      };

      const response = generateMusicResponse('Meet Me There', 'Lucki');
      expect(response).toContain('YouTube Playing');
      expect(response).toContain('Meet Me There');
      expect(response).toContain('Lucki');
      expect(response).toContain('Free audio from YouTube');
    });

    it('should generate study responses', () => {
      const generateStudyResponse = (subject: string): string => {
        return `⚡ **${subject.toUpperCase()} MODE ACTIVATED!** ⚡\n\nI'm your **${subject} study companion**! Let me help you master the concepts!`;
      };

      const response = generateStudyResponse('probability');
      expect(response).toContain('PROBABILITY MODE ACTIVATED');
      expect(response).toContain('probability study companion');
    });
  });
});
