// NFC Tap-to-Connect System
// Nintendo DS PictoChat-level simplicity

export interface NFCGameShare {
  gameId: string;
  gameName: string;
  playerId: string;
  playerName: string;
  gameData: {
    roomCode: string;
    maxPlayers: number;
    gameMode: string;
  };
  timestamp: number;
}

export interface NFCFriendProfile {
  userId: string;
  username: string;
  avatar: string;
  games: string[];
  online: boolean;
  lastSeen: number;
}

export class NFCGameSharing {
  private ndefReader: NDEFReader | null = null;
  private isSharing: boolean = false;
  private isListening: boolean = false;

  constructor() {
    this.checkNFCSupport();
  }

  private checkNFCSupport(): boolean {
    if ('NDEFReader' in window) {
      this.ndefReader = new NDEFReader();
      return true;
    }
    return false;
  }

  async shareGame(gameData: NFCGameShare): Promise<boolean> {
    if (!this.ndefReader) {
      throw new Error('NFC not supported on this device');
    }

    try {
      this.isSharing = true;
      
      await this.ndefReader.write({
        records: [{
          recordType: 'mime',
          mediaType: 'application/json',
          data: JSON.stringify(gameData)
        }]
      });

      console.log('📱 Game shared via NFC:', gameData.gameName);
      return true;
    } catch (error) {
      console.error('❌ NFC share failed:', error);
      return false;
    } finally {
      this.isSharing = false;
    }
  }

  async readGameShare(): Promise<NFCGameShare | null> {
    if (!this.ndefReader) {
      throw new Error('NFC not supported on this device');
    }

    return new Promise((resolve) => {
      const handleReading = (event: any) => {
        try {
          const data = JSON.parse(event.data);
          if (data.gameId && data.gameName) {
            console.log('📱 Game received via NFC:', data.gameName);
            resolve(data);
          } else {
            resolve(null);
          }
        } catch (error) {
          console.error('❌ NFC read failed:', error);
          resolve(null);
        }
      };

      this.ndefReader!.addEventListener('reading', handleReading);
      
      // Auto-remove listener after 10 seconds
      setTimeout(() => {
        this.ndefReader!.removeEventListener('reading', handleReading);
        resolve(null);
      }, 10000);
    });
  }

  async shareFriendProfile(friendData: NFCFriendProfile): Promise<boolean> {
    if (!this.ndefReader) {
      throw new Error('NFC not supported on this device');
    }

    try {
      await this.ndefReader.write({
        records: [{
          recordType: 'mime',
          mediaType: 'application/json',
          data: JSON.stringify(friendData)
        }]
      });

      console.log('👤 Friend profile shared via NFC:', friendData.username);
      return true;
    } catch (error) {
      console.error('❌ NFC friend share failed:', error);
      return false;
    }
  }

  async readFriendProfile(): Promise<NFCFriendProfile | null> {
    if (!this.ndefReader) {
      throw new Error('NFC not supported on this device');
    }

    return new Promise((resolve) => {
      const handleReading = (event: any) => {
        try {
          const data = JSON.parse(event.data);
          if (data.userId && data.username) {
            console.log('👤 Friend profile received via NFC:', data.username);
            resolve(data);
          } else {
            resolve(null);
          }
        } catch (error) {
          console.error('❌ NFC friend read failed:', error);
          resolve(null);
        }
      };

      this.ndefReader!.addEventListener('reading', handleReading);
      
      // Auto-remove listener after 10 seconds
      setTimeout(() => {
        this.ndefReader!.removeEventListener('reading', handleReading);
        resolve(null);
      }, 10000);
    });
  }

  isNFCSupported(): boolean {
    return this.ndefReader !== null;
  }

  isCurrentlySharing(): boolean {
    return this.isSharing;
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }
}
