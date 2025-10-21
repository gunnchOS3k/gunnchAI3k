/**
 * gunnchAI3k Spotify Integration
 * High-performance Spotify API integration for DJ playlist management
 */

import { Client } from 'discord.js';
import axios from 'axios';
import { createHash, randomBytes } from 'crypto';
import { URLSearchParams } from 'url';

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  external_urls: {
    spotify: string;
  };
  preview_url: string | null;
  popularity: number;
  explicit: boolean;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  tracks: {
    total: number;
    items: SpotifyPlaylistTrack[];
  };
  external_urls: {
    spotify: string;
  };
  images: SpotifyImage[];
  owner: {
    display_name: string;
    external_urls: {
      spotify: string;
    };
  };
}

export interface SpotifyPlaylistTrack {
  track: SpotifyTrack;
  added_at: string;
  added_by: {
    id: string;
    external_urls: {
      spotify: string;
    };
  };
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  external_urls: {
    spotify: string;
  };
  images: SpotifyImage[];
  country: string;
  product: string;
}

export interface SpotifyAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export class SpotifyIntegration {
  private client: Client;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private userTokens: Map<string, SpotifyAuthTokens> = new Map();
  private baseUrl = 'https://api.spotify.com/v1';
  private authUrl = 'https://accounts.spotify.com/authorize';
  private tokenUrl = 'https://accounts.spotify.com/api/token';

  constructor(client: Client) {
    this.client = client;
    this.clientId = process.env.SPOTIFY_CLIENT_ID || '';
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
    this.redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/callback';
    
    if (!this.clientId || !this.clientSecret) {
      console.warn('⚠️ Spotify credentials not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.');
    }
  }

  /**
   * Generate Spotify OAuth URL for user authentication
   */
  public generateAuthUrl(userId: string, scopes: string[] = [
    'user-read-private',
    'user-read-email',
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-library-read',
    'user-library-modify',
    'user-top-read',
    'user-read-recently-played'
  ]): string {
    const state = this.generateState(userId);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: scopes.join(' '),
      redirect_uri: this.redirectUri,
      state: state,
      show_dialog: 'true'
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access tokens
   */
  public async exchangeCodeForTokens(code: string, state: string): Promise<SpotifyAuthTokens> {
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

      const tokens: SpotifyAuthTokens = response.data;
      this.userTokens.set(state, tokens);
      return tokens;
    } catch (error) {
      console.error('❌ Failed to exchange Spotify code for tokens:', error);
      throw new Error('Failed to authenticate with Spotify');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  public async refreshAccessToken(userId: string): Promise<SpotifyAuthTokens> {
    const userTokens = this.userTokens.get(userId);
    if (!userTokens) {
      throw new Error('User not authenticated with Spotify');
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

      const newTokens: SpotifyAuthTokens = response.data;
      newTokens.refresh_token = userTokens.refresh_token; // Keep the refresh token
      this.userTokens.set(userId, newTokens);
      return newTokens;
    } catch (error) {
      console.error('❌ Failed to refresh Spotify token:', error);
      throw new Error('Failed to refresh Spotify token');
    }
  }

  /**
   * Get user's Spotify profile
   */
  public async getUserProfile(userId: string): Promise<SpotifyUser> {
    const tokens = await this.getValidTokens(userId);
    
    try {
      const response = await axios.get(`${this.baseUrl}/me`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('❌ Failed to get Spotify user profile:', error);
      throw new Error('Failed to get Spotify user profile');
    }
  }

  /**
   * Search for tracks on Spotify
   */
  public async searchTracks(query: string, userId: string, limit: number = 20): Promise<SpotifyTrack[]> {
    const tokens = await this.getValidTokens(userId);
    
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          q: query,
          type: 'track',
          limit: limit
        },
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });

      return response.data.tracks.items;
    } catch (error) {
      console.error('❌ Failed to search Spotify tracks:', error);
      throw new Error('Failed to search Spotify tracks');
    }
  }

  /**
   * Get user's playlists
   */
  public async getUserPlaylists(userId: string, limit: number = 50): Promise<SpotifyPlaylist[]> {
    const tokens = await this.getValidTokens(userId);
    
    try {
      const response = await axios.get(`${this.baseUrl}/me/playlists`, {
        params: {
          limit: limit
        },
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });

      return response.data.items;
    } catch (error) {
      console.error('❌ Failed to get Spotify playlists:', error);
      throw new Error('Failed to get Spotify playlists');
    }
  }

  /**
   * Get playlist tracks
   */
  public async getPlaylistTracks(playlistId: string, userId: string, limit: number = 100): Promise<SpotifyPlaylistTrack[]> {
    const tokens = await this.getValidTokens(userId);
    
    try {
      const response = await axios.get(`${this.baseUrl}/playlists/${playlistId}/tracks`, {
        params: {
          limit: limit
        },
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });

      return response.data.items;
    } catch (error) {
      console.error('❌ Failed to get Spotify playlist tracks:', error);
      throw new Error('Failed to get Spotify playlist tracks');
    }
  }

  /**
   * Create a new playlist
   */
  public async createPlaylist(name: string, description: string, userId: string, isPublic: boolean = false): Promise<SpotifyPlaylist> {
    const tokens = await this.getValidTokens(userId);
    const userProfile = await this.getUserProfile(userId);
    
    try {
      const response = await axios.post(`${this.baseUrl}/users/${userProfile.id}/playlists`, {
        name: name,
        description: description,
        public: isPublic
      }, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('❌ Failed to create Spotify playlist:', error);
      throw new Error('Failed to create Spotify playlist');
    }
  }

  /**
   * Add tracks to playlist
   */
  public async addTracksToPlaylist(playlistId: string, trackIds: string[], userId: string): Promise<void> {
    const tokens = await this.getValidTokens(userId);
    
    try {
      await axios.post(`${this.baseUrl}/playlists/${playlistId}/tracks`, {
        uris: trackIds.map(id => `spotify:track:${id}`)
      }, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('❌ Failed to add tracks to Spotify playlist:', error);
      throw new Error('Failed to add tracks to Spotify playlist');
    }
  }

  /**
   * Get user's top tracks
   */
  public async getTopTracks(userId: string, timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term', limit: number = 20): Promise<SpotifyTrack[]> {
    const tokens = await this.getValidTokens(userId);
    
    try {
      const response = await axios.get(`${this.baseUrl}/me/top/tracks`, {
        params: {
          time_range: timeRange,
          limit: limit
        },
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });

      return response.data.items;
    } catch (error) {
      console.error('❌ Failed to get Spotify top tracks:', error);
      throw new Error('Failed to get Spotify top tracks');
    }
  }

  /**
   * Get user's recently played tracks
   */
  public async getRecentlyPlayed(userId: string, limit: number = 20): Promise<SpotifyTrack[]> {
    const tokens = await this.getValidTokens(userId);
    
    try {
      const response = await axios.get(`${this.baseUrl}/me/player/recently-played`, {
        params: {
          limit: limit
        },
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });

      return response.data.items.map((item: any) => item.track);
    } catch (error) {
      console.error('❌ Failed to get Spotify recently played:', error);
      throw new Error('Failed to get Spotify recently played');
    }
  }

  /**
   * Get track recommendations
   */
  public async getRecommendations(userId: string, seedTracks: string[], limit: number = 20): Promise<SpotifyTrack[]> {
    const tokens = await this.getValidTokens(userId);
    
    try {
      const response = await axios.get(`${this.baseUrl}/recommendations`, {
        params: {
          seed_tracks: seedTracks.join(','),
          limit: limit
        },
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });

      return response.data.tracks;
    } catch (error) {
      console.error('❌ Failed to get Spotify recommendations:', error);
      throw new Error('Failed to get Spotify recommendations');
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
  private async getValidTokens(userId: string): Promise<SpotifyAuthTokens> {
    const tokens = this.userTokens.get(userId);
    if (!tokens) {
      throw new Error('User not authenticated with Spotify');
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
  public storeUserTokens(userId: string, tokens: SpotifyAuthTokens): void {
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

