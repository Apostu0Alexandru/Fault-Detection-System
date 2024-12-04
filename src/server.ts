import { RaftNode } from './raft.js';
import { KeyValueStore } from './key-value-store.js';
import express from 'express';
import http from 'http';

export class ServerNode {
  private server: http.Server;
  private raftNode: RaftNode;
  private kvStore: KeyValueStore;
  private app: express.Application;

  constructor(nodeId: string, nodes: string[], port: number) {
    this.raftNode = new RaftNode(nodeId, nodes);
    this.kvStore = new KeyValueStore();
    this.app = express();

    this.setupRaftListeners();
    this.setupExpressRoutes();

    this.server = this.app.listen(port, () => {
      console.log(`Server node ${nodeId} listening on port ${port}`);
    });
  }

  private setupRaftListeners() {
    this.raftNode.on('newLogEntry', (entry: { command: string }) => {
      const [action, key, value] = entry.command.split(' ');
      switch (action) {
        case 'SET':
          this.kvStore.set(key, value);
          break;
        case 'DELETE':
          this.kvStore.delete(key);
          break;
        case 'CLEAR':
          this.kvStore.clear();
          break;
      }
    });

    this.raftNode.on('appendEntries', (args: any, callback: (response: { term: number; success: boolean }) => void) => {
      this.raftNode.appendEntries(args, callback);
    });

    this.raftNode.on('requestVote', (args: any, callback: (response: { term: number; voteGranted: boolean }) => void) => {
      this.raftNode.requestVote(args, callback);
    });
  }

  private setupExpressRoutes() {
    this.app.use(express.json());

    this.app.get('/:key', (req, res) => {
      const value = this.kvStore.get(req.params.key);
      if (value !== undefined) {
        res.json({ key: req.params.key, value });
      } else {
        res.status(404).json({ error: 'Key not found' });
      }
    });

    this.app.put('/:key', (req, res) => {
      const { value } = req.body;
      this.raftNode.clientRequest(`SET ${req.params.key} ${value}`, (success: boolean) => {
        if (!res.headersSent) {
          if (success) {
            res.json({ message: 'Value set successfully' });
          } else {
            res.status(500).json({ error: 'Failed to set value' });
          }
        }
      });
    });

    this.app.delete('/:key', (req, res) => {
      this.raftNode.clientRequest(`DELETE ${req.params.key}`, (success: boolean) => {
        if (!res.headersSent) {
          if (success) {
            res.json({ message: 'Key deleted successfully' });
          } else {
            res.status(500).json({ error: 'Failed to delete key' });
          }
        }
      });
    });

    this.app.post('/clear', (req, res) => {
      this.raftNode.clientRequest('CLEAR', (success: boolean) => {
        if (!res.headersSent) {
          if (success) {
            res.json({ message: 'Store cleared successfully' });
          } else {
            res.status(500).json({ error: 'Failed to clear store' });
          }
        }
      });
    });
  }

  public close() {
    this.raftNode.cleanup();
    this.server.close(() => {
      console.log(`Server node ${this.raftNode.nodeId} closed`);
    });
  }
}

