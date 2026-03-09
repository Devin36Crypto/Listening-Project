import { PeerNode } from '../types';

class DiscoveryService {
    private peers: Map<string, PeerNode> = new Map();
    private onNodesChanged: (nodes: PeerNode[]) => void = () => { };

    public setUpdateListener(callback: (nodes: PeerNode[]) => void) {
        this.onNodesChanged = callback;
    }

    public async scanForPeers() {
        // Simulate finding a peer for prototype demo
        if (this.peers.size === 0) {
            const mockPeer: PeerNode = {
                id: 'peer-' + Math.random().toString(36).substring(2, 9),
                device: {
                    type: 'phone',
                    model: 'Guest iPhone 15'
                },
                name: 'Guest iPhone 15',
                status: 'connecting',
                confidence: 0,
                lastSeen: new Date(),
                role: 'secondary'
            };
            this.peers.set(mockPeer.id, mockPeer);
            this.onNodesChanged(Array.from(this.peers.values()));

            // simulate successful connection
            setTimeout(() => {
                const connectedPeer: PeerNode = {
                    ...mockPeer,
                    status: 'online',
                    confidence: 0.95,
                    lastSeen: new Date()
                };
                this.peers.set(mockPeer.id, connectedPeer);
                this.onNodesChanged(Array.from(this.peers.values()));
            }, 2000);
        }
    }

    public getActiveNodes(): PeerNode[] {
        return Array.from(this.peers.values());
    }
}

export const discoveryService = new DiscoveryService();
