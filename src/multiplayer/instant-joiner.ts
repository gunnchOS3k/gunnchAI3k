// Instant Game Joiner
// Nintendo DS one-click simplicity

import { NFCGameSharing, NFCGameShare } from './nfc';
import { BluetoothGameDiscovery, BluetoothGameDevice } from './bluetooth';
import { LocalGameDiscovery, LocalGameServer } from './local-network';

export interface GameConnection {
  connectionType: 'nfc' | 'bluetooth' | 'local' | 'qr';
  gameId: string;
  gameName: string;
  playerCount: number;
  maxPlayers: number;
  hostName: string;
  ping?: number;
  signalStrength?: number;
  distance?: number;
  timestamp: number;
}

export interface JoinResult {
  success: boolean;
  gameId?: string;
  gameName?: string;
  error?: string;
  connectionTime?: number;
}

export class InstantGameJoiner {
  private nfc: NFCGameSharing;
  private bluetooth: BluetoothGameDiscovery;
  private local: LocalGameDiscovery;
  private isJoining: boolean = false;

  constructor() {
    this.nfc = new NFCGameSharing();
    this.bluetooth = new BluetoothGameDiscovery();
    this.local = new LocalGameDiscovery();
  }

  async nfcJoin(): Promise<JoinResult> {
    if (!this.nfc.isNFCSupported()) {
      return {
        success: false,
        error: 'NFC not supported on this device'
      };
    }

    try {
      this.isJoining = true;
      const startTime = Date.now();

      const gameData = await this.nfc.readGameShare();
      
      if (!gameData) {
        return {
          success: false,
          error: 'No game data received via NFC'
        };
      }

      const connectionTime = Date.now() - startTime;
      
      // Join the game
      await this.joinGame({
        connectionType: 'nfc',
        gameId: gameData.gameId,
        gameName: gameData.gameName,
        playerCount: 1,
        maxPlayers: gameData.gameData.maxPlayers,
        hostName: gameData.playerName,
        timestamp: Date.now()
      });

      return {
        success: true,
        gameId: gameData.gameId,
        gameName: gameData.gameName,
        connectionTime
      };
    } catch (error) {
      return {
        success: false,
        error: `NFC join failed: ${error}`
      };
    } finally {
      this.isJoining = false;
    }
  }

  async bluetoothJoin(): Promise<JoinResult> {
    if (!this.bluetooth.isBluetoothSupported()) {
      return {
        success: false,
        error: 'Bluetooth not supported on this device'
      };
    }

    try {
      this.isJoining = true;
      const startTime = Date.now();

      const devices = await this.bluetooth.startDiscovery();
      
      if (devices.length === 0) {
        return {
          success: false,
          error: 'No Bluetooth games found'
        };
      }

      // Join the first available game
      const device = devices[0];
      const success = await this.bluetooth.joinGame(device.deviceId);
      
      if (!success) {
        return {
          success: false,
          error: 'Failed to join Bluetooth game'
        };
      }

      const connectionTime = Date.now() - startTime;

      return {
        success: true,
        gameId: device.gameId,
        gameName: device.gameName,
        connectionTime
      };
    } catch (error) {
      return {
        success: false,
        error: `Bluetooth join failed: ${error}`
      };
    } finally {
      this.isJoining = false;
    }
  }

  async localJoin(): Promise<JoinResult> {
    try {
      this.isJoining = true;
      const startTime = Date.now();

      const games = await this.local.scanLocalNetwork();
      
      if (games.length === 0) {
        return {
          success: false,
          error: 'No local games found'
        };
      }

      // Join the first available game
      const game = games[0];
      const success = await this.local.joinGame(game.ip, game.port);
      
      if (!success) {
        return {
          success: false,
          error: 'Failed to join local game'
        };
      }

      const connectionTime = Date.now() - startTime;

      return {
        success: true,
        gameId: game.gameId,
        gameName: game.gameName,
        connectionTime
      };
    } catch (error) {
      return {
        success: false,
        error: `Local join failed: ${error}`
      };
    } finally {
      this.isJoining = false;
    }
  }

  async qrJoin(qrData: string): Promise<JoinResult> {
    try {
      this.isJoining = true;
      const startTime = Date.now();

      // Parse QR code data
      const gameData = JSON.parse(qrData);
      
      if (!gameData.gameId || !gameData.gameName) {
        return {
          success: false,
          error: 'Invalid QR code data'
        };
      }

      const connectionTime = Date.now() - startTime;

      // Join the game
      await this.joinGame({
        connectionType: 'qr',
        gameId: gameData.gameId,
        gameName: gameData.gameName,
        playerCount: gameData.playerCount || 1,
        maxPlayers: gameData.maxPlayers || 4,
        hostName: gameData.hostName || 'Unknown Host',
        timestamp: Date.now()
      });

      return {
        success: true,
        gameId: gameData.gameId,
        gameName: gameData.gameName,
        connectionTime
      };
    } catch (error) {
      return {
        success: false,
        error: `QR join failed: ${error}`
      };
    } finally {
      this.isJoining = false;
    }
  }

  private async joinGame(connection: GameConnection): Promise<void> {
    // Start game connection
    console.log(`🎮 Joining game: ${connection.gameName} via ${connection.connectionType}`);
    
    // This would typically involve:
    // 1. Establishing a connection to the game server
    // 2. Sending player information
    // 3. Starting the game session
    // 4. Updating the UI to show the game is starting
  }

  async getAvailableGames(): Promise<{
    nfc: boolean;
    bluetooth: BluetoothGameDevice[];
    local: LocalGameServer[];
  }> {
    const bluetoothGames = this.bluetooth.getDiscoveredDevices();
    const localGames = this.local.getDiscoveredGames();

    return {
      nfc: this.nfc.isNFCSupported(),
      bluetooth: bluetoothGames,
      local: localGames
    };
  }

  async startDiscovery(): Promise<void> {
    // Start all discovery methods
    await Promise.allSettled([
      this.bluetooth.startDiscovery(),
      this.local.scanLocalNetwork()
    ]);
  }

  async stopDiscovery(): Promise<void> {
    // Stop all discovery methods
    await Promise.allSettled([
      this.bluetooth.stopDiscovery(),
      this.local.stopScanning()
    ]);
  }

  isCurrentlyJoining(): boolean {
    return this.isJoining;
  }

  getConnectionMethods(): string[] {
    const methods: string[] = [];
    
    if (this.nfc.isNFCSupported()) {
      methods.push('nfc');
    }
    
    if (this.bluetooth.isBluetoothSupported()) {
      methods.push('bluetooth');
    }
    
    methods.push('local'); // Local network is always available
    methods.push('qr'); // QR code is always available
    
    return methods;
  }
}
