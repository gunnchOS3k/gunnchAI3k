import { YouTubeMusicManager } from '../src/music/youtube-music-manager';

// Mock Discord.js Client
const mockClient = {
  user: { tag: 'gunnchAI3k#5214' }
};

describe('YouTubeMusicManager', () => {
  let musicManager: YouTubeMusicManager;

  beforeEach(() => {
    musicManager = new YouTubeMusicManager(mockClient as any);
  });

  describe('Service Status', () => {
    it('should return service status', () => {
      const status = musicManager.getServiceStatus();
      expect(status).toContain('YouTube Music Service Status');
      expect(status).toContain('YouTube Always Available');
      expect(status).toContain('Free music streaming');
    });
  });

  describe('Recommended Tracks', () => {
    it('should return recommended tracks', () => {
      const tracks = musicManager.getRecommendedTracks();
      expect(Array.isArray(tracks)).toBe(true);
      expect(tracks.length).toBeGreaterThan(0);
      
      tracks.forEach(track => {
        expect(track).toHaveProperty('id');
        expect(track).toHaveProperty('title');
        expect(track).toHaveProperty('artist');
        expect(track).toHaveProperty('duration');
        expect(track).toHaveProperty('url');
      });
    });
  });

  describe('Cache Stats', () => {
    it('should return cache statistics', () => {
      const stats = musicManager.getCacheStats();
      expect(stats).toContain('YouTube Cache Stats');
      expect(stats).toContain('Cached Searches');
      expect(stats).toContain('Memory Usage');
      expect(stats).toContain('Performance');
    });
  });

  describe('Search Functionality', () => {
    it('should search for tracks', async () => {
      const results = await musicManager.searchTrack('test song');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should cache search results', async () => {
      await musicManager.searchTrack('cached song');
      const stats = musicManager.getCacheStats();
      expect(stats).toContain('**Cached Searches:** 1');
    });
  });

  describe('Playback Functionality', () => {
    it('should play tracks', async () => {
      const mockTrack = {
        id: 'test_1',
        title: 'Test Song',
        artist: 'Test Artist',
        duration: 180,
        url: 'https://www.youtube.com/watch?v=test'
      };

      const response = await musicManager.playTrack(mockTrack);
      expect(response).toContain('YouTube Playing');
      expect(response).toContain('Test Song');
      expect(response).toContain('Test Artist');
    });

    it('should handle YouTube URLs', async () => {
      const validUrl = 'https://www.youtube.com/watch?v=test1234567';
      const response = await musicManager.playYouTubeUrl(validUrl);
      expect(response).toContain('YouTube URL Playing');
      expect(response).toContain(validUrl);
    });

    it('should reject invalid YouTube URLs', async () => {
      const invalidUrl = 'https://invalid-url.com';
      await expect(musicManager.playYouTubeUrl(invalidUrl)).rejects.toThrow('Invalid YouTube URL');
    });
  });

  describe('Playlist Creation', () => {
    it('should create playlists', async () => {
      const mockTracks = [
        {
          id: '1',
          title: 'Song 1',
          artist: 'Artist 1',
          duration: 180,
          url: 'https://youtube.com/1'
        },
        {
          id: '2',
          title: 'Song 2',
          artist: 'Artist 2',
          duration: 240,
          url: 'https://youtube.com/2'
        }
      ];

      const response = await musicManager.createPlaylist('Test Playlist', mockTracks);
      expect(response).toContain('YouTube Playlist Created');
      expect(response).toContain('Test Playlist');
      expect(response).toContain('**Tracks:** 2');
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', () => {
      musicManager.clearCache();
      const stats = musicManager.getCacheStats();
      expect(stats).toContain('**Cached Searches:** 0');
    });
  });
});
