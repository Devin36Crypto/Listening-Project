import { PeerNode } from '../types';

class DiscoveryService {
  private listeners: ((nodes: PeerNode[]) => void)[] = [];
  private nodes: PeerNode[] = [];

  constructor() {
    // Mock initial state
    this.nodes = [];
  }

  setUpdateListener(callback: (nodes: PeerNode[]) => void) {
    this.listeners.push(callback);
  }

  advertisePresence() {
    console.log('Advertising presence...');
    // In a real app, this would use Bluetooth/Ultrasonic/WebRTC
  }

  scanForPeers() {
    console.log('Scanning for peers...');
    // Simulate finding a peer
    setTimeout(() => {
      const mockPeer: PeerNode = {
        id: crypto.randomUUID(),
        name: 'Peer ' + Math.floor(Math.random() * 100),
        position: { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 },
        lastSeen: Date.now()
      };
      this.nodes.push(mockPeer);
      this.notifyListeners();
    }, 2000);
  }

  private notifyListeners() {
    this.listeners.forEach(l => l(this.nodes));
  }
}

export const discoveryService = new DiscoveryService();
