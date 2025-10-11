// Bluetooth Phone-to-Phone Discovery
// Nintendo DS local wireless simplicity

export interface BluetoothGameDevice {
  deviceId: string;
  deviceName: string;
  gameId: string;
  gameName: string;
  playerCount: number;
  maxPlayers: number;
  signalStrength: number;
  distance: number;
  lastSeen: number;
}

export interface BluetoothGameData {
  connectionType: 'bluetooth';
  deviceId: string;
  deviceName: string;
  gameId: string;
  gameName: string;
  timestamp: number;
}

export class BluetoothGameDiscovery {
  private devices: Map<string, BluetoothGameDevice> = new Map();
  private isDiscovering: boolean = false;
  private discoveryInterval: number | null = null;

  constructor() {
    this.checkBluetoothSupport();
  }

  private checkBluetoothSupport(): boolean {
    return 'bluetooth' in navigator;
  }

  async startDiscovery(): Promise<BluetoothGameDevice[]> {
    if (!this.checkBluetoothSupport()) {
      throw new Error('Bluetooth not supported on this device');
    }

    this.isDiscovering = true;
    this.devices.clear();

    try {
      // Start Bluetooth discovery
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { name: 'gunnchAI3k Hub' },
          { namePrefix: 'gunnchAI3k' },
          { namePrefix: 'gunnchAI3k-' }
        ],
        optionalServices: [
          '0000180f-0000-1000-8000-00805f9b34fb', // Battery service
          '0000180a-0000-1000-8000-00805f9b34fb'  // Device info service
        ]
      });

      await this.connectToDevice(device);
      
      // Start continuous discovery
      this.startContinuousDiscovery();
      
      return Array.from(this.devices.values());
    } catch (error) {
      console.error('❌ Bluetooth discovery failed:', error);
      this.isDiscovering = false;
      return [];
    }
  }

  private startContinuousDiscovery(): void {
    this.discoveryInterval = window.setInterval(async () => {
      if (this.isDiscovering) {
        await this.scanForDevices();
      }
    }, 5000); // Scan every 5 seconds
  }

  private async scanForDevices(): Promise<void> {
    try {
      // Scan for nearby Bluetooth devices
      const devices = await navigator.bluetooth.getAvailability();
      
      if (devices) {
        // Update device list with current scan results
        await this.updateDeviceList();
      }
    } catch (error) {
      console.error('❌ Bluetooth scan failed:', error);
    }
  }

  private async updateDeviceList(): Promise<void> {
    // Update device list with current scan results
    // This would typically involve scanning for specific service UUIDs
    // and updating the devices map with new discoveries
  }

  async connectToDevice(device: BluetoothDevice): Promise<boolean> {
    try {
      const server = await device.gatt?.connect();
      
      if (server) {
        const service = await server.getPrimaryService('0000180f-0000-1000-8000-00805f9b34fb');
        
        // Start game connection
        await this.startGameConnection(device);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Bluetooth connection failed:', error);
      return false;
    }
  }

  private async startGameConnection(device: BluetoothDevice): Promise<void> {
    const gameData: BluetoothGameData = {
      connectionType: 'bluetooth',
      deviceId: device.id,
      deviceName: device.name || 'Unknown Device',
      gameId: 'anime-aggressors', // Default game
      gameName: 'Anime Aggressors',
      timestamp: Date.now()
    };

    // Store device info
    const deviceInfo: BluetoothGameDevice = {
      deviceId: device.id,
      deviceName: device.name || 'Unknown Device',
      gameId: gameData.gameId,
      gameName: gameData.gameName,
      playerCount: 1,
      maxPlayers: 4,
      signalStrength: 100, // Assume strong signal
      distance: 0, // Unknown distance
      lastSeen: Date.now()
    };

    this.devices.set(device.id, deviceInfo);
    
    console.log('📡 Bluetooth game connection started:', gameData.gameName);
  }

  async joinGame(deviceId: string): Promise<boolean> {
    const device = this.devices.get(deviceId);
    
    if (!device) {
      throw new Error('Device not found');
    }

    try {
      // Start game connection
      await this.startGameConnection({
        id: deviceId,
        name: device.deviceName
      } as BluetoothDevice);

      console.log('🎮 Joined game via Bluetooth:', device.gameName);
      return true;
    } catch (error) {
      console.error('❌ Bluetooth game join failed:', error);
      return false;
    }
  }

  async stopDiscovery(): Promise<void> {
    this.isDiscovering = false;
    
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
    
    console.log('📡 Bluetooth discovery stopped');
  }

  getDiscoveredDevices(): BluetoothGameDevice[] {
    return Array.from(this.devices.values());
  }

  isCurrentlyDiscovering(): boolean {
    return this.isDiscovering;
  }

  isBluetoothSupported(): boolean {
    return this.checkBluetoothSupport();
  }

  getDeviceCount(): number {
    return this.devices.size;
  }

  clearDevices(): void {
    this.devices.clear();
  }
}
