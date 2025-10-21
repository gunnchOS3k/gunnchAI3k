/**
 * gunnchAI3k Apple Music Integration
 * High-performance Apple Music API integration for DJ playlist management
 */

import { Client } from 'discord.js';
import axios from 'axios';
import { createHash, randomBytes } from 'crypto';
import { URLSearchParams } from 'url';

export interface AppleMusicTrack {
  id: string;
  type: 'songs';
  attributes: {
    name: string;
    artistName: string;
    albumName: string;
    durationInMillis: number;
    genreNames: string[];
    releaseDate: string;
    isrc: string;
    artwork: {
      width: number;
      height: number;
      url: string;
    };
    url: string;
    previews: Array<{
      url: string;
    }>;
    playParams: {
      id: string;
      kind: string;
    };
  };
}

export interface AppleMusicPlaylist {
  id: string;
  type: 'playlists';
  attributes: {
    name: string;
    description: string;
    artwork: {
      width: number;
      height: number;
      url: string;
    };
    url: string;
    playParams: {
      id: string;
      kind: string;
    };
    isPublic: boolean;
    dateAdded: string;
    lastModifiedDate: string;
  };
  relationships: {
    tracks: {
      data: AppleMusicTrack[];
    };
  };
}

export interface AppleMusicAlbum {
  id: string;
  type: 'albums';
  attributes: {
    name: string;
    artistName: string;
    artwork: {
      width: number;
      height: number;
      url: string;
    };
    url: string;
    releaseDate: string;
    genreNames: string[];
    isComplete: boolean;
    isSingle: boolean;
  };
}

export interface AppleMusicArtist {
  id: string;
  type: 'artists';
  attributes: {
    name: string;
    artwork: {
      width: number;
      height: number;
      url: string;
    };
    url: string;
    genreNames: string[];
  };
}

export interface AppleMusicUser {
  id: string;
  type: 'users';
  attributes: {
    name: string;
    email: string;
    country: string;
  };
}

export interface AppleMusicAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export class AppleMusicIntegration {
  private client: Client;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private userTokens: Map<string, AppleMusicAuthTokens> = new Map();
  private baseUrl = 'https://api.music.apple.com/v1';
  private authUrl = 'https://appleid.apple.com/auth/authorize';
  private tokenUrl = 'https://appleid.apple.com/auth/token';

  constructor(client: Client) {
    this.client = client;
    this.clientId = process.env.APPLE_MUSIC_CLIENT_ID || '';
    this.clientSecret = process.env.APPLE_MUSIC_CLIENT_SECRET || '';
    this.redirectUri = process.env.APPLE_MUSIC_REDIRECT_URI || 'http://localhost:3000/callback';
    
    if (!this.clientId || !this.clientSecret) {
      console.warn('⚠️ Apple Music credentials not configured. Set APPLE_MUSIC_CLIENT_ID and APPLE_MUSIC_CLIENT_SECRET environment variables.');
    }
  }

  /**
   * Generate Apple Music OAuth URL for user authentication
   */
  public generateAuthUrl(userId: string, scopes: string[] = [
    'music-user-library-read',
    'music-user-library-modify',
    'music-user-playback-read',
    'music-user-playback-modify'
  ]): string {
    const state = this.generateState(userId);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: scopes.join(' '),
      redirect_uri: this.redirectUri,
      state: state,
      response_mode: 'form_post'
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access tokens
   */
  public async exchangeCodeForTokens(code: string, state: string): Promise<AppleMusicAuthTokens> {
    try {
      const response = await axios.post(this.tokenUrl, new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const tokens: AppleMusicAuthTokens = response.data;
      this.userTokens.set(state, tokens);
      return tokens;
    } catch (error) {
      console.error('❌ Failed to exchange Apple Music code for tokens:', error);
      throw new Error('Failed to authenticate with Apple Music');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  public async refreshAccessToken(userId: string): Promise<AppleMusicAuthTokens> {
    const userTokens = this.userTokens.get(userId);
    if (!userTokens) {
      throw new Error('User not authenticated with Apple Music');
    }

    try {
      const response = await axios.post(this.tokenUrl, new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: userTokens.refresh_token,
        client_id: this.clientId,
        client_secret: this.clientSecret
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const newTokens: AppleMusicAuthTokens = response.data;
      newTokens.refresh_token = userTokens.refresh_token; // Keep the refresh token
      this.userTokens.set(userId, newTokens);
      return newTokens;
    } catch (error) {
      console.error('❌ Failed to refresh Apple Music token:', error);
      throw new Error('Failed to refresh Apple Music token');
    }
  }

  /**
   * Get user's Apple Music profile
   */
  public async getUserProfile(userId: string): Promise<AppleMusicUser> {
    const tokens = await this.getValidTokens(userId);
    
    try {
      const response = await axios.get(`${this.baseUrl}/me`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });

      return response.data.data[0];
    } catch (error) {
      console.error('❌ Failed to get Apple Music user profile:', error);
      throw new Error('Failed to get Apple Music user profile');
    }
  }

  /**
   * Search for tracks on Apple Music
   */
  public async searchTracks(query: string, userId: string, limit: number = 20): Promise<AppleMusicTrack[]> {
    const tokens = await this.getValidTokens(userId);
    
    try {
      const response = await axios.get(`${this.baseUrl}/catalog/us/search`, {
        params: {
          term: query,
          types: 'songs',
          limit: limit
        },
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });

      return response.data.results.songs?.data || [];
    } catch (error) {
      console.error('❌ Failed to search Apple Music tracks:', error);
      throw new Error('Failed to search Apple Music tracks');
    }
  }

  /**
   * Get user's playlists
   */
  public async getUserPlaylists(userId: string, limit: number = 50): Promise<AppleMusicPlaylist[]> {
    const tokens = await this.getValidTokens(userId);
    
    try {
      const response = await axios.get(`${this.baseUrl}/me/library/playlists`, {
        params: {
          limit: limit
        },
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });

      return response.data.data;
    } catch (error) {
      console.error('❌ Failed to get Apple Music playlists:', error);
      throw new Error('Failed to get Apple Music playlists');
    }
  }

  /**
   * Get playlist tracks
   */
  public async getPlaylistTracks(playlistId: string, userId: string, limit: number = 100): Promise<AppleMusicTrack[]> {
    const tokens = await this.getValidTokens(userId);
    
    try {
      const response = await axios.get(`${this.baseUrl}/me/library/playlists/${playlistId}/tracks`, {
        params: {
          limit: limit
        },
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });

      return response.data.data;
    } catch (error) {
      console.error('❌ Failed to get Apple Music playlist tracks:', error);
      throw new Error('Failed to get Apple Music playlist tracks');
    }
  }

  /**
   * Create a new playlist
   */
  public async createPlaylist(name: string, description: string, userId: string, isPublic: boolean = false): Promise<AppleMusicPlaylist> {
    const tokens = await this.getValidTokens(userId);
    
    try {
      const response = await axios.post(`${this.baseUrl}/me/library/playlists`, {
        attributes: {
          name: name,
          description: description,
          isPublic: isPublic
        }
      }, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.data[0];
    } catch (error) {
      console.error('❌ Failed to create Apple Music playlist:', error);
      throw new Error('Failed to create Apple Music playlist');
    }
  }

  /**
   * Add tracks to playlist
   */
  public async addTracksToPlaylist(playlistId: string, trackIds: string[], userId: string): Promise<void> {
    const tokens = await this.getValidTokens(userId);
    
    try {
      await axios.post(`${this.baseUrl}/me/library/playlists/${playlistId}/tracks`, {
        data: trackIds.map(id => ({
          id: id,
          type: 'songs'
        }))
      }, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('❌ Failed to add tracks to Apple Music playlist:', error);
      throw new Error('Failed to add tracks to Apple Music playlist');
    }
  }

  /**
   * Get user's library tracks
   */
  public async getLibraryTracks(userId: string, limit: number = 100): Promise<AppleMusicTrack[]> {
    const tokens = await this.getValidTokens(userId);
    
    try {
      const response = await axios.get(`${this.baseUrl}/me/library/songs`, {
        params: {
          limit: limit
        },
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });

      return response.data.data;
    } catch (error) {
      console.error('❌ Failed to get Apple Music library tracks:', error);
      throw new Error('Failed to get Apple Music library tracks');
    }
  }

  /**
   * Get user's library albums
   */
  public async getLibraryAlbums(userId: string, limit: number = 100): Promise<AppleMusicAlbum[]> {
    const tokens = await this.getValidTokens(userId);
    
    try {
      const response = await axios.get(`${this.baseUrl}/me/library/albums`, {
        params: {
          limit: limit
        },
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });

      return response.data.data;
    } catch (error) {
      console.error('❌ Failed to get Apple Music library albums:', error);
      throw new Error('Failed to get Apple Music library albums');
    }
  }

  /**
   * Get user's library artists
   */
  public async getLibraryArtists(userId: string, limit: number = 100): Promise<AppleMusicArtist[]> {
    const tokens = await this.getValidTokens(userId);
    
    try {
      const response = await axios.get(`${this.baseUrl}/me/library/artists`, {
        params: {
          limit: limit
        },
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });

      return response.data.data;
    } catch (error) {
      console.error('❌ Failed to get Apple Music library artists:', error);
      throw new Error('Failed to get Apple Music library artists');
    }
  }

  /**
   * Get track recommendations
   */
  public async getRecommendations(userId: string, seedTracks: string[], limit: number = 20): Promise<AppleMusicTrack[]> {
    const tokens = await this.getValidTokens(userId);
    
    try {
      const response = await axios.get(`${this.baseUrl}/me/recommendations`, {
        params: {
          seed_tracks: seedTracks.join(','),
          limit: limit
        },
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });

      return response.data.data;
    } catch (error) {
      console.error('❌ Failed to get Apple Music recommendations:', error);
      throw new Error('Failed to get Apple Music recommendations');
    }
  }

  /**
   * Get track by ID
   */
  public async getTrack(trackId: string, userId: string): Promise<AppleMusicTrack> {
    const tokens = await this.getValidTokens(userId);
    
    try {
      const response = await axios.get(`${this.baseUrl}/catalog/us/songs/${trackId}`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });

      return response.data.data[0];
    } catch (error) {
      console.error('❌ Failed to get Apple Music track:', error);
      throw new Error('Failed to get Apple Music track');
    }
  }

  /**
   * Get album by ID
   */
  public async getAlbum(albumId: string, userId: string): Promise<AppleMusicAlbum> {
    const tokens = await this.getValidTokens(userId);
    
    try {
      const response = await axios.get(`${this.baseUrl}/catalog/us/albums/${albumId}`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });

      return response.data.data[0];
    } catch (error) {
      console.error('❌ Failed to get Apple Music album:', error);
      throw new Error('Failed to get Apple Music album');
    }
  }

  /**
   * Get artist by ID
   */
  public async getArtist(artistId: string, userId: string): Promise<AppleMusicArtist> {
    const tokens = await this.getValidTokens(userId);
    
    try {
      const response = await axios.get(`${this.baseUrl}/catalog/us/artists/${artistId}`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });

      return response.data.data[0];
    } catch (error) {
      console.error('❌ Failed to get Apple Music artist:', error);
      throw new Error('Failed to get Apple Music artist');
    }
  }

  /**
   * Check if user is authenticated
   */
  public isUserAuthenticated(userId: string): boolean {
    return this.userTokens.has(userId);
  }

  /**
   * Get valid tokens (refresh if needed)
   */
  private async getValidTokens(userId: string): Promise<AppleMusicAuthTokens> {
    const tokens = this.userTokens.get(userId);
    if (!tokens) {
      throw new Error('User not authenticated with Apple Music');
    }

    // Check if token is expired (with 5 minute buffer)
    const now = Date.now();
    const expiresAt = tokens.expires_in * 1000;
    
    if (now >= expiresAt - 300000) { // 5 minutes buffer
      return await this.refreshAccessToken(userId);
    }

    return tokens;
  }

  /**
   * Generate state parameter for OAuth
   */
  private generateState(userId: string): string {
    const random = randomBytes(16).toString('hex');
    const hash = createHash('sha256').update(userId + random).digest('hex');
    return hash;
  }

  /**
   * Store user tokens
   */
  public storeUserTokens(userId: string, tokens: AppleMusicAuthTokens): void {
    this.userTokens.set(userId, tokens);
  }

  /**
   * Remove user tokens
   */
  public removeUserTokens(userId: string): void {
    this.userTokens.delete(userId);
  }

  /**
   * Get all authenticated users
   */
  public getAuthenticatedUsers(): string[] {
    return Array.from(this.userTokens.keys());
  }
}

