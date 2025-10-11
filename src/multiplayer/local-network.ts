// Local Network Game Discovery
// Nintendo DS local wireless simplicity

export interface LocalGameServer {
  ip: string;
  port: number;
  gameId: string;
  gameName: string;
  playerCount: number;
  maxPlayers: number;
  hostName: string;
  ping: number;
  lastSeen: number;
  status: 'online' | 'offline' | 'full';
}

export interface LocalGameData {
  connectionType: 'local';
  ip: string;
  port: number;
  gameId: string;
  gameName: string;
  timestamp: number;
}

export class LocalGameDiscovery {
  private localGames: Map<string, LocalGameServer> = new Map();
  private isScanning: boolean = false;
  private scanInterval: number | null = null;
  private baseIP: string = '';

  constructor() {
    this.detectBaseIP();
  }

  private detectBaseIP(): void {
    // Detect local network base IP
    // This is a simplified version - in reality, you'd need to detect the actual network
    this.baseIP = '192.168.1'; // Default home network
  }

  async scanLocalNetwork(): Promise<LocalGameServer[]> {
    this.isScanning = true;
    this.localGames.clear();

    try {
      console.log('🌐 Scanning local network for games...');
      
      // Scan common IP ranges
      const ipRanges = [
        '192.168.1',
        '192.168.0',
        '10.0.0',
        '172.16.0'
      ];

      for (const baseIP of ipRanges) {
        await this.scanIPRange(baseIP);
      }

      // Start continuous scanning
      this.startContinuousScanning();
      
      return Array.from(this.localGames.values());
    } catch (error) {
      console.error('❌ Local network scan failed:', error);
      this.isScanning = false;
      return [];
    }
  }

  private async scanIPRange(baseIP: string): Promise<void> {
    const promises: Promise<void>[] = [];
    
    // Scan IPs 1-254 in the range
    for (let i = 1; i <= 254; i++) {
      const ip = `${baseIP}.${i}`;
      promises.push(this.checkForGame(ip));
    }

    // Wait for all scans to complete
    await Promise.allSettled(promises);
  }

  private async checkForGame(ip: string): Promise<void> {
    try {
      // Check for gunnchAI3k game server on common ports
      const ports = [3000, 3001, 8080, 8081];
      
      for (const port of ports) {
        const gameData = await this.checkGamePort(ip, port);
        if (gameData) {
          this.localGames.set(`${ip}:${port}`, gameData);
        }
      }
    } catch (error) {
      // No game on this IP
    }
  }

  private async checkGamePort(ip: string, port: number): Promise<LocalGameServer | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000); // 1 second timeout

      const response = await fetch(`http://${ip}:${port}/api/game/status`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'gunnchAI3k-Hub/1.0'
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const gameData = await response.json();
        
        return {
          ip,
          port,
          gameId: gameData.gameId || 'unknown',
          gameName: gameData.gameName || 'Unknown Game',
          playerCount: gameData.playerCount || 0,
          maxPlayers: gameData.maxPlayers || 4,
          hostName: gameData.hostName || 'Unknown Host',
          ping: Date.now() - gameData.timestamp,
          lastSeen: Date.now(),
          status: gameData.status || 'online'
        };
      }
    } catch (error) {
      // No game on this port
    }
    
    return null;
  }

  private startContinuousScanning(): void {
    this.scanInterval = window.setInterval(async () => {
      if (this.isScanning) {
        await this.scanLocalNetwork();
      }
    }, 30000); // Scan every 30 seconds
  }

  async joinGame(ip: string, port: number): Promise<boolean> {
    const gameKey = `${ip}:${port}`;
    const game = this.localGames.get(gameKey);
    
    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status === 'full') {
      throw new Error('Game is full');
    }

    try {
      const gameData: LocalGameData = {
        connectionType: 'local',
        ip,
        port,
        gameId: game.gameId,
        gameName: game.gameName,
        timestamp: Date.now()
      };

      // Start game connection
      await this.startGameConnection(gameData);

      console.log('🎮 Joined local game:', game.gameName);
      return true;
    } catch (error) {
      console.error('❌ Local game join failed:', error);
      return false;
    }
  }

  private async startGameConnection(gameData: LocalGameData): Promise<void> {
    // Start game connection to local server
    console.log('🌐 Connecting to local game:', gameData.gameName);
    
    // This would typically involve establishing a WebSocket connection
    // or making HTTP requests to the local game server
  }

  async stopScanning(): Promise<void> {
    this.isScanning = false;
    
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
    console.log('🌐 Local network scanning stopped');
  }

  getDiscoveredGames(): LocalGameServer[] {
    return Array.from(this.localGames.values());
  }

  isCurrentlyScanning(): boolean {
    return this.isScanning;
  }

  getGameCount(): number {
    return this.localGames.size;
  }

  clearGames(): void {
    this.localGames.clear();
  }

  getGameByIP(ip: string, port: number): LocalGameServer | null {
    const gameKey = `${ip}:${port}`;
    return this.localGames.get(gameKey) || null;
  }

  updateGameStatus(ip: string, port: number, status: 'online' | 'offline' | 'full'): void {
    const gameKey = `${ip}:${port}`;
    const game = this.localGames.get(gameKey);
    
    if (game) {
      game.status = status;
      game.lastSeen = Date.now();
      this.localGames.set(gameKey, game);
    }
  }
}
