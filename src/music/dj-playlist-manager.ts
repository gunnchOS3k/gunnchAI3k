/**
 * gunnchAI3k DJ Playlist Manager
 * High-performance DJ playlist management with Spotify and Apple Music integration
 */

import { Client } from 'discord.js';
import { SpotifyIntegration, SpotifyTrack, SpotifyPlaylist } from './spotify-integration';
import { AppleMusicIntegration, AppleMusicTrack, AppleMusicPlaylist } from './apple-music-integration';

export interface DJPlaylist {
  id: string;
  name: string;
  description: string;
  tracks: DJTrack[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  source: 'spotify' | 'apple_music' | 'mixed';
  totalDuration: number;
  trackCount: number;
}

export interface DJTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  url: string;
  previewUrl: string | null;
  source: 'spotify' | 'apple_music';
  sourceId: string;
  addedAt: Date;
  addedBy: string;
  tags: string[];
  genre: string;
  popularity: number;
  explicit: boolean;
}

export interface DJSession {
  id: string;
  name: string;
  description: string;
  host: string;
  participants: string[];
  currentTrack: DJTrack | null;
  queue: DJTrack[];
  history: DJTrack[];
  playlists: DJPlaylist[];
  isActive: boolean;
  createdAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  settings: DJSessionSettings;
}

export interface DJSessionSettings {
  allowQueueRequests: boolean;
  allowPlaylistRequests: boolean;
  maxQueueLength: number;
  maxHistoryLength: number;
  autoPlay: boolean;
  shuffleMode: boolean;
  repeatMode: 'none' | 'one' | 'all';
  crossfadeDuration: number;
  volume: number;
}

export interface DJStats {
  totalSessions: number;
  totalTracksPlayed: number;
  totalDuration: number;
  mostPlayedTracks: Array<{ track: DJTrack; count: number }>;
  mostActiveUsers: Array<{ userId: string; count: number }>;
  averageSessionDuration: number;
  favoriteGenres: Array<{ genre: string; count: number }>;
}

export class DJPlaylistManager {
  private client: Client;
  private spotifyIntegration: SpotifyIntegration;
  private appleMusicIntegration: AppleMusicIntegration;
  private playlists: Map<string, DJPlaylist> = new Map();
  private sessions: Map<string, DJSession> = new Map();
  private userStats: Map<string, DJStats> = new Map();

  constructor(client: Client) {
    this.client = client;
    this.spotifyIntegration = new SpotifyIntegration(client);
    this.appleMusicIntegration = new AppleMusicIntegration(client);
  }

  /**
   * Create a new DJ playlist
   */
  public async createPlaylist(
    name: string,
    description: string,
    userId: string,
    source: 'spotify' | 'apple_music' | 'mixed' = 'mixed',
    isPublic: boolean = false
  ): Promise<DJPlaylist> {
    const playlist: DJPlaylist = {
      id: this.generateId(),
      name,
      description,
      tracks: [],
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic,
      source,
      totalDuration: 0,
      trackCount: 0
    };

    this.playlists.set(playlist.id, playlist);
    return playlist;
  }

  /**
   * Add track to playlist
   */
  public async addTrackToPlaylist(
    playlistId: string,
    track: DJTrack,
    userId: string
  ): Promise<void> {
    const playlist = this.playlists.get(playlistId);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    // Check permissions
    if (playlist.createdBy !== userId && !playlist.isPublic) {
      throw new Error('No permission to modify this playlist');
    }

    playlist.tracks.push(track);
    playlist.trackCount = playlist.tracks.length;
    playlist.totalDuration = playlist.tracks.reduce((sum, t) => sum + t.duration, 0);
    playlist.updatedAt = new Date();

    this.playlists.set(playlistId, playlist);
  }

  /**
   * Remove track from playlist
   */
  public async removeTrackFromPlaylist(
    playlistId: string,
    trackId: string,
    userId: string
  ): Promise<void> {
    const playlist = this.playlists.get(playlistId);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    // Check permissions
    if (playlist.createdBy !== userId && !playlist.isPublic) {
      throw new Error('No permission to modify this playlist');
    }

    playlist.tracks = playlist.tracks.filter(t => t.id !== trackId);
    playlist.trackCount = playlist.tracks.length;
    playlist.totalDuration = playlist.tracks.reduce((sum, t) => sum + t.duration, 0);
    playlist.updatedAt = new Date();

    this.playlists.set(playlistId, playlist);
  }

  /**
   * Get playlist by ID
   */
  public getPlaylist(playlistId: string): DJPlaylist | null {
    return this.playlists.get(playlistId) || null;
  }

  /**
   * Get user's playlists
   */
  public getUserPlaylists(userId: string): DJPlaylist[] {
    return Array.from(this.playlists.values()).filter(p => p.createdBy === userId);
  }

  /**
   * Get public playlists
   */
  public getPublicPlaylists(): DJPlaylist[] {
    return Array.from(this.playlists.values()).filter(p => p.isPublic);
  }

  /**
   * Search playlists
   */
  public searchPlaylists(query: string, userId?: string): DJPlaylist[] {
    const allPlaylists = userId 
      ? this.getUserPlaylists(userId)
      : Array.from(this.playlists.values());

    return allPlaylists.filter(playlist =>
      playlist.name.toLowerCase().includes(query.toLowerCase()) ||
      playlist.description.toLowerCase().includes(query.toLowerCase())
    );
  }

  /**
   * Create DJ session
   */
  public async createSession(
    name: string,
    description: string,
    host: string,
    settings: Partial<DJSessionSettings> = {}
  ): Promise<DJSession> {
    const session: DJSession = {
      id: this.generateId(),
      name,
      description,
      host,
      participants: [host],
      currentTrack: null,
      queue: [],
      history: [],
      playlists: [],
      isActive: false,
      createdAt: new Date(),
      startedAt: null,
      endedAt: null,
      settings: {
        allowQueueRequests: true,
        allowPlaylistRequests: true,
        maxQueueLength: 100,
        maxHistoryLength: 1000,
        autoPlay: true,
        shuffleMode: false,
        repeatMode: 'none',
        crossfadeDuration: 0,
        volume: 1.0,
        ...settings
      }
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Start DJ session
   */
  public async startSession(sessionId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.host !== userId) {
      throw new Error('Only the host can start the session');
    }

    session.isActive = true;
    session.startedAt = new Date();
    this.sessions.set(sessionId, session);
  }

  /**
   * End DJ session
   */
  public async endSession(sessionId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.host !== userId) {
      throw new Error('Only the host can end the session');
    }

    session.isActive = false;
    session.endedAt = new Date();
    this.sessions.set(sessionId, session);
  }

  /**
   * Join DJ session
   */
  public async joinSession(sessionId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.participants.includes(userId)) {
      return; // Already joined
    }

    session.participants.push(userId);
    this.sessions.set(sessionId, session);
  }

  /**
   * Leave DJ session
   */
  public async leaveSession(sessionId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.participants = session.participants.filter(id => id !== userId);
    this.sessions.set(sessionId, session);
  }

  /**
   * Add track to session queue
   */
  public async addTrackToQueue(
    sessionId: string,
    track: DJTrack,
    userId: string
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.participants.includes(userId)) {
      throw new Error('User not in session');
    }

    if (!session.settings.allowQueueRequests && session.host !== userId) {
      throw new Error('Queue requests not allowed');
    }

    if (session.queue.length >= session.settings.maxQueueLength) {
      throw new Error('Queue is full');
    }

    session.queue.push(track);
    this.sessions.set(sessionId, session);
  }

  /**
   * Remove track from session queue
   */
  public async removeTrackFromQueue(
    sessionId: string,
    trackId: string,
    userId: string
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.host !== userId) {
      throw new Error('Only the host can remove tracks from queue');
    }

    session.queue = session.queue.filter(t => t.id !== trackId);
    this.sessions.set(sessionId, session);
  }

  /**
   * Play next track in session
   */
  public async playNextTrack(sessionId: string, userId: string): Promise<DJTrack | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.host !== userId) {
      throw new Error('Only the host can control playback');
    }

    if (session.queue.length === 0) {
      return null;
    }

    const track = session.queue.shift()!;
    session.currentTrack = track;
    session.history.push(track);

    // Limit history length
    if (session.history.length > session.settings.maxHistoryLength) {
      session.history = session.history.slice(-session.settings.maxHistoryLength);
    }

    this.sessions.set(sessionId, session);
    return track;
  }

  /**
   * Get session by ID
   */
  public getSession(sessionId: string): DJSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get user's sessions
   */
  public getUserSessions(userId: string): DJSession[] {
    return Array.from(this.sessions.values()).filter(s => 
      s.host === userId || s.participants.includes(userId)
    );
  }

  /**
   * Get active sessions
   */
  public getActiveSessions(): DJSession[] {
    return Array.from(this.sessions.values()).filter(s => s.isActive);
  }

  /**
   * Search tracks across platforms
   */
  public async searchTracks(
    query: string,
    userId: string,
    platforms: ('spotify' | 'apple_music')[] = ['spotify', 'apple_music'],
    limit: number = 20
  ): Promise<DJTrack[]> {
    const tracks: DJTrack[] = [];

    for (const platform of platforms) {
      try {
        if (platform === 'spotify' && this.spotifyIntegration.isUserAuthenticated(userId)) {
          const spotifyTracks = await this.spotifyIntegration.searchTracks(query, userId, limit);
          const djTracks = spotifyTracks.map(track => this.convertSpotifyTrack(track, userId));
          tracks.push(...djTracks);
        } else if (platform === 'apple_music' && this.appleMusicIntegration.isUserAuthenticated(userId)) {
          const appleMusicTracks = await this.appleMusicIntegration.searchTracks(query, userId, limit);
          const djTracks = appleMusicTracks.map(track => this.convertAppleMusicTrack(track, userId));
          tracks.push(...djTracks);
        }
      } catch (error) {
        console.error(`❌ Failed to search ${platform} tracks:`, error);
      }
    }

    return tracks.slice(0, limit);
  }

  /**
   * Get track recommendations
   */
  public async getRecommendations(
    userId: string,
    seedTracks: DJTrack[],
    platforms: ('spotify' | 'apple_music')[] = ['spotify', 'apple_music'],
    limit: number = 20
  ): Promise<DJTrack[]> {
    const recommendations: DJTrack[] = [];

    for (const platform of platforms) {
      try {
        if (platform === 'spotify' && this.spotifyIntegration.isUserAuthenticated(userId)) {
          const seedIds = seedTracks
            .filter(t => t.source === 'spotify')
            .map(t => t.sourceId);
          
          if (seedIds.length > 0) {
            const spotifyTracks = await this.spotifyIntegration.getRecommendations(userId, seedIds, limit);
            const djTracks = spotifyTracks.map(track => this.convertSpotifyTrack(track, userId));
            recommendations.push(...djTracks);
          }
        } else if (platform === 'apple_music' && this.appleMusicIntegration.isUserAuthenticated(userId)) {
          const seedIds = seedTracks
            .filter(t => t.source === 'apple_music')
            .map(t => t.sourceId);
          
          if (seedIds.length > 0) {
            const appleMusicTracks = await this.appleMusicIntegration.getRecommendations(userId, seedIds, limit);
            const djTracks = appleMusicTracks.map(track => this.convertAppleMusicTrack(track, userId));
            recommendations.push(...djTracks);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to get ${platform} recommendations:`, error);
      }
    }

    return recommendations.slice(0, limit);
  }

  /**
   * Get user's DJ statistics
   */
  public getUserStats(userId: string): DJStats {
    const stats = this.userStats.get(userId) || {
      totalSessions: 0,
      totalTracksPlayed: 0,
      totalDuration: 0,
      mostPlayedTracks: [],
      mostActiveUsers: [],
      averageSessionDuration: 0,
      favoriteGenres: []
    };

    return stats;
  }

  /**
   * Update user statistics
   */
  public updateUserStats(userId: string, track: DJTrack): void {
    const stats = this.userStats.get(userId) || {
      totalSessions: 0,
      totalTracksPlayed: 0,
      totalDuration: 0,
      mostPlayedTracks: [],
      mostActiveUsers: [],
      averageSessionDuration: 0,
      favoriteGenres: []
    };

    stats.totalTracksPlayed++;
    stats.totalDuration += track.duration;

    // Update most played tracks
    const existingTrack = stats.mostPlayedTracks.find(t => t.track.id === track.id);
    if (existingTrack) {
      existingTrack.count++;
    } else {
      stats.mostPlayedTracks.push({ track, count: 1 });
    }

    // Update favorite genres
    if (track.genre) {
      const existingGenre = stats.favoriteGenres.find(g => g.genre === track.genre);
      if (existingGenre) {
        existingGenre.count++;
      } else {
        stats.favoriteGenres.push({ genre: track.genre, count: 1 });
      }
    }

    this.userStats.set(userId, stats);
  }

  /**
   * Convert Spotify track to DJ track
   */
  private convertSpotifyTrack(track: SpotifyTrack, userId: string): DJTrack {
    return {
      id: this.generateId(),
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      duration: track.duration_ms,
      url: track.external_urls.spotify,
      previewUrl: track.preview_url,
      source: 'spotify',
      sourceId: track.id,
      addedAt: new Date(),
      addedBy: userId,
      tags: [],
      genre: track.album.images[0]?.url || '',
      popularity: track.popularity,
      explicit: track.explicit
    };
  }

  /**
   * Convert Apple Music track to DJ track
   */
  private convertAppleMusicTrack(track: AppleMusicTrack, userId: string): DJTrack {
    return {
      id: this.generateId(),
      title: track.attributes.name,
      artist: track.attributes.artistName,
      album: track.attributes.albumName,
      duration: track.attributes.durationInMillis,
      url: track.attributes.url,
      previewUrl: track.attributes.previews[0]?.url || null,
      source: 'apple_music',
      sourceId: track.id,
      addedAt: new Date(),
      addedBy: userId,
      tags: track.attributes.genreNames,
      genre: track.attributes.genreNames[0] || '',
      popularity: 0,
      explicit: false
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
}

