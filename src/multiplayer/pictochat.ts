// PictoChat-Style Communication
// Nintendo DS simple drawing/chat system

export interface PictoChatMessage {
  id: string;
  sender: string;
  senderId: string;
  message: string;
  drawing?: string; // Base64 drawing data
  timestamp: number;
  messageType: 'text' | 'drawing' | 'game_invite' | 'friend_request';
}

export interface PictoChatRoom {
  roomId: string;
  roomName: string;
  participants: string[];
  messages: PictoChatMessage[];
  maxParticipants: number;
  isPrivate: boolean;
  createdAt: number;
}

export interface NearbyPlayer {
  playerId: string;
  playerName: string;
  avatar: string;
  games: string[];
  online: boolean;
  lastSeen: number;
  distance: number;
  signalStrength: number;
}

export class PictoChat {
  private messages: PictoChatMessage[] = [];
  private rooms: Map<string, PictoChatRoom> = new Map();
  private nearbyPlayers: Map<string, NearbyPlayer> = new Map();
  private currentRoom: string | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.initializePictoChat();
  }

  private initializePictoChat(): void {
    // Initialize PictoChat system
    console.log('💬 PictoChat initialized');
  }

  async sendMessage(message: string, drawing?: string): Promise<boolean> {
    try {
      const chatMessage: PictoChatMessage = {
        id: this.generateId(),
        sender: this.getCurrentUser(),
        senderId: this.getCurrentUserId(),
        message,
        drawing,
        timestamp: Date.now(),
        messageType: drawing ? 'drawing' : 'text'
      };

      this.messages.push(chatMessage);
      
      // Broadcast to all nearby players
      await this.broadcastMessage(chatMessage);
      
      console.log('💬 Message sent:', message);
      return true;
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      return false;
    }
  }

  async sendGameInvite(gameId: string, gameName: string): Promise<boolean> {
    try {
      const inviteMessage: PictoChatMessage = {
        id: this.generateId(),
        sender: this.getCurrentUser(),
        senderId: this.getCurrentUserId(),
        message: `Want to play ${gameName}?`,
        timestamp: Date.now(),
        messageType: 'game_invite'
      };

      this.messages.push(inviteMessage);
      await this.broadcastMessage(inviteMessage);
      
      console.log('🎮 Game invite sent:', gameName);
      return true;
    } catch (error) {
      console.error('❌ Failed to send game invite:', error);
      return false;
    }
  }

  async sendFriendRequest(playerId: string): Promise<boolean> {
    try {
      const friendMessage: PictoChatMessage = {
        id: this.generateId(),
        sender: this.getCurrentUser(),
        senderId: this.getCurrentUserId(),
        message: 'Want to be friends?',
        timestamp: Date.now(),
        messageType: 'friend_request'
      };

      this.messages.push(friendMessage);
      await this.broadcastMessage(friendMessage);
      
      console.log('👤 Friend request sent to:', playerId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send friend request:', error);
      return false;
    }
  }

  private async broadcastMessage(message: PictoChatMessage): Promise<void> {
    // Broadcast message to all nearby players
    const nearbyPlayers = Array.from(this.nearbyPlayers.values());
    
    for (const player of nearbyPlayers) {
      if (player.online) {
        await this.sendToPlayer(player, message);
      }
    }
  }

  private async sendToPlayer(player: NearbyPlayer, message: PictoChatMessage): Promise<void> {
    // Send message to specific player
    // This would typically involve WebSocket or Bluetooth communication
    console.log(`📤 Sending message to ${player.playerName}:`, message.message);
  }

  async createRoom(roomName: string, isPrivate: boolean = false): Promise<string> {
    const roomId = this.generateId();
    const room: PictoChatRoom = {
      roomId,
      roomName,
      participants: [this.getCurrentUserId()],
      messages: [],
      maxParticipants: 8,
      isPrivate,
      createdAt: Date.now()
    };

    this.rooms.set(roomId, room);
    this.currentRoom = roomId;
    
    console.log('🏠 Room created:', roomName);
    return roomId;
  }

  async joinRoom(roomId: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return false;
    }

    if (room.participants.length >= room.maxParticipants) {
      return false;
    }

    room.participants.push(this.getCurrentUserId());
    this.currentRoom = roomId;
    
    console.log('🏠 Joined room:', room.roomName);
    return true;
  }

  async leaveRoom(): Promise<void> {
    if (this.currentRoom) {
      const room = this.rooms.get(this.currentRoom);
      if (room) {
        room.participants = room.participants.filter(id => id !== this.getCurrentUserId());
      }
      this.currentRoom = null;
    }
  }

  async discoverNearbyPlayers(): Promise<NearbyPlayer[]> {
    // Discover nearby players using various methods
    const players: NearbyPlayer[] = [];
    
    // This would typically involve:
    // 1. Bluetooth scanning
    // 2. Local network scanning
    // 3. NFC detection
    // 4. WiFi Direct discovery
    
    return players;
  }

  async addNearbyPlayer(player: NearbyPlayer): Promise<void> {
    this.nearbyPlayers.set(player.playerId, player);
    console.log('👤 Nearby player added:', player.playerName);
  }

  async removeNearbyPlayer(playerId: string): Promise<void> {
    this.nearbyPlayers.delete(playerId);
    console.log('👤 Nearby player removed:', playerId);
  }

  getMessages(): PictoChatMessage[] {
    return this.messages;
  }

  getCurrentRoom(): PictoChatRoom | null {
    if (this.currentRoom) {
      return this.rooms.get(this.currentRoom) || null;
    }
    return null;
  }

  getNearbyPlayers(): NearbyPlayer[] {
    return Array.from(this.nearbyPlayers.values());
  }

  getRooms(): PictoChatRoom[] {
    return Array.from(this.rooms.values());
  }

  isConnected(): boolean {
    return this.isConnected;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private getCurrentUser(): string {
    return 'gunnchOS3k'; // This would come from user profile
  }

  private getCurrentUserId(): string {
    return 'user123'; // This would come from user profile
  }
}
