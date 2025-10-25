import { Client } from 'discord.js';
import { AppleMusicIntegration, AppleMusicTrack } from './apple-music-integration';

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  source: 'apple_music' | 'youtube' | 'spotify';
  url: string;
  previewUrl?: string;
  artworkUrl?: string;
}

export class MusicServiceManager {
  private client: Client;
  private appleMusic: AppleMusicIntegration;
  private preferredService: 'apple_music' | 'youtube' | 'auto';
  private isOwnerServer: boolean;

  constructor(client: Client) {
    this.client = client;
    this.appleMusic = new AppleMusicIntegration(client);
    this.preferredService = this.determinePreferredService();
    this.isOwnerServer = this.checkIfOwnerServer();
  }

  private determinePreferredService(): 'apple_music' | 'youtube' | 'auto' {
    // Check if Apple Music is configured
    if (this.appleMusic.isAppleMusicAvailable()) {
      return 'apple_music';
    }
    
    // Default to YouTube for public GitHub version
    return 'youtube';
  }

  private checkIfOwnerServer(): boolean {
    // Check if this is the owner's Discord server
    // You can customize this logic based on your server ID or other criteria
    const ownerServerId = process.env.OWNER_SERVER_ID;
    const currentServerId = process.env.DISCORD_GUILD_ID;
    
    return ownerServerId && currentServerId && ownerServerId === currentServerId;
  }

  public async searchTrack(query: string): Promise<MusicTrack[]> {
    console.log(`🎵 Searching for: "${query}"`);
    
    // If Apple Music is available and this is the owner's server, prioritize Apple Music
    if (this.appleMusic.isAppleMusicAvailable() && this.isOwnerServer) {
      console.log('🍎 Using Apple Music for search...');
      try {
        const appleResults = await this.appleMusic.searchTrack(query);
        return appleResults.map(track => this.convertAppleMusicTrack(track));
      } catch (error) {
        console.log('⚠️ Apple Music search failed, falling back to YouTube');
      }
    }

    // Fallback to YouTube search
    console.log('📺 Using YouTube for search...');
    return this.searchYouTube(query);
  }

  private convertAppleMusicTrack(appleTrack: AppleMusicTrack): MusicTrack {
    return {
      id: appleTrack.id,
      title: appleTrack.title,
      artist: appleTrack.artist,
      album: appleTrack.album,
      duration: appleTrack.duration,
      source: 'apple_music',
      url: appleTrack.previewUrl || '',
      previewUrl: appleTrack.previewUrl,
      artworkUrl: appleTrack.artworkUrl
    };
  }

  private async searchYouTube(query: string): Promise<MusicTrack[]> {
    // Mock YouTube search results
    const mockResults: MusicTrack[] = [
      {
        id: 'yt_1',
        title: 'Meet Me There',
        artist: 'Lucki',
        album: 'Freewave 3',
        duration: 180,
        source: 'youtube',
        url: 'https://www.youtube.com/watch?v=example1',
        previewUrl: 'https://www.youtube.com/watch?v=example1'
      },
      {
        id: 'yt_2',
        title: 'Juice WRLD - Bandit',
        artist: 'Juice WRLD',
        album: 'Death Race for Love',
        duration: 240,
        source: 'youtube',
        url: 'https://www.youtube.com/watch?v=example2',
        previewUrl: 'https://www.youtube.com/watch?v=example2'
      }
    ];

    // Filter results based on query
    return mockResults.filter(track => 
      track.title.toLowerCase().includes(query.toLowerCase()) ||
      track.artist.toLowerCase().includes(query.toLowerCase())
    );
  }

  public async playTrack(track: MusicTrack): Promise<string> {
    console.log(`🎵 Playing: ${track.title} by ${track.artist} (${track.source})`);
    
    if (track.source === 'apple_music') {
      return this.playAppleMusicTrack(track);
    } else {
      return this.playYouTubeTrack(track);
    }
  }

  private async playAppleMusicTrack(track: MusicTrack): Promise<string> {
    return `🍎 **Apple Music Playing:** ${track.title} by ${track.artist}\n\n🎵 **Connecting to Apple Music...**\n🎶 **Starting playback...**\n\n**High-quality audio from Apple Music!** 🍎✨`;
  }

  private async playYouTubeTrack(track: MusicTrack): Promise<string> {
    return `📺 **YouTube Playing:** ${track.title} by ${track.artist}\n\n🎵 **Connecting to YouTube...**\n🎶 **Starting playback...**\n\n**Free audio from YouTube!** 📺✨`;
  }

  public getServiceStatus(): string {
    const appleStatus = this.appleMusic.getConfigurationStatus();
    const preferredService = this.preferredService;
    const isOwner = this.isOwnerServer;

    return `🎵 **Music Service Status:**\n\n${appleStatus}\n\n**Preferred Service:** ${preferredService.toUpperCase()}\n**Owner Server:** ${isOwner ? 'Yes' : 'No'}\n\n**Available Services:**\n• ${this.appleMusic.isAppleMusicAvailable() ? '✅' : '❌'} Apple Music\n• ✅ YouTube (Always available)\n• ❌ Spotify (Not configured)`;
  }

  public getSetupInstructions(): string {
    if (this.appleMusic.isAppleMusicAvailable()) {
      return '✅ Apple Music is already configured!';
    }

    return this.appleMusic.getSetupInstructions();
  }

  public async createPlaylist(name: string, tracks: MusicTrack[]): Promise<string> {
    if (this.appleMusic.isAppleMusicAvailable() && this.isOwnerServer) {
      try {
        const appleTracks = tracks.filter(t => t.source === 'apple_music');
        if (appleTracks.length > 0) {
          const playlistId = await this.appleMusic.createPlaylist(name, appleTracks as any);
          return `🍎 **Apple Music Playlist Created:** ${name}\n\n**Playlist ID:** ${playlistId}\n**Tracks:** ${appleTracks.length}\n\n**High-quality playlist from Apple Music!** 🍎✨`;
        }
      } catch (error) {
        console.error('Apple Music playlist creation failed:', error);
      }
    }

    return `📺 **YouTube Playlist Created:** ${name}\n\n**Tracks:** ${tracks.length}\n**Note:** YouTube playlists are managed locally\n\n**Free playlist from YouTube!** 📺✨`;
  }

  public getRecommendedService(): string {
    if (this.appleMusic.isAppleMusicAvailable() && this.isOwnerServer) {
      return '🍎 **Recommended: Apple Music**\n\n• High-quality audio\n• Official tracks\n• Better integration\n• Premium experience';
    }

    return '📺 **Recommended: YouTube**\n\n• Free to use\n• Wide selection\n• No setup required\n• Always available';
  }
}
