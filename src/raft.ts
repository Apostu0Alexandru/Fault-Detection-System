import { EventEmitter } from 'events';

enum NodeState {
  FOLLOWER,
  CANDIDATE,
  LEADER
}

interface LogEntry {
  term: number;
  command: string;
}

export class RaftNode extends EventEmitter {
  private state: NodeState;
  private currentTerm: number;
  private votedFor: string | null;
  private log: LogEntry[];
  private commitIndex: number;
  private lastApplied: number;
  private electionTimeout: NodeJS.Timeout | null;
  private heartbeatInterval: NodeJS.Timeout | null;
  private leaderStepDownTimeout: NodeJS.Timeout | null;

  constructor(public readonly nodeId: string, private nodes: string[]) {
    super();
    this.state = NodeState.FOLLOWER;
    this.currentTerm = 0;
    this.votedFor = null;
    this.log = [];
    this.commitIndex = 0;
    this.lastApplied = 0;
    this.electionTimeout = null;
    this.heartbeatInterval = null;
    this.leaderStepDownTimeout = null;
    this.resetElectionTimeout();
  }

  private resetElectionTimeout() {
    if (this.electionTimeout) {
      clearTimeout(this.electionTimeout);
    }
    this.electionTimeout = setTimeout(() => this.startElection(), Math.random() * 150 + 150);
  }

  private startElection() {
    if (this.state === NodeState.LEADER) {
      return;
    }
    this.state = NodeState.CANDIDATE;
    this.currentTerm++;
    this.votedFor = this.nodeId;
    this.resetElectionTimeout();

    console.log(`Node ${this.nodeId} starting election for term ${this.currentTerm}`);

    let votesReceived = 1;
    this.nodes.forEach(node => {
      if (node !== this.nodeId) {
        this.emit('requestVote', {
          term: this.currentTerm,
          candidateId: this.nodeId,
          lastLogIndex: this.log.length - 1,
          lastLogTerm: this.log.length > 0 ? this.log[this.log.length - 1].term : 0
        }, (response: { term: number, voteGranted: boolean }) => {
          if (this.state !== NodeState.CANDIDATE) {
            return;
          }
          if (response.term > this.currentTerm) {
            this.becomeFollower(response.term);
          } else if (response.voteGranted) {
            votesReceived++;
            if (votesReceived > this.nodes.length / 2) {
              this.becomeLeader();
            }
          }
        });
      }
    });
  }

  private becomeLeader() {
    if (this.state === NodeState.CANDIDATE) {
      this.state = NodeState.LEADER;
      console.log(`Node ${this.nodeId} became leader for term ${this.currentTerm}`);
      if (this.electionTimeout) {
        clearTimeout(this.electionTimeout);
      }
      this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), 50);
      this.resetLeaderStepDownTimeout();
    }
  }

  private resetLeaderStepDownTimeout() {
    if (this.leaderStepDownTimeout) {
      clearTimeout(this.leaderStepDownTimeout);
    }
    this.leaderStepDownTimeout = setTimeout(() => {
      if (this.state === NodeState.LEADER) {
        console.log(`Leader ${this.nodeId} stepping down due to inactivity`);
        this.becomeFollower(this.currentTerm);
      }
    }, 500);
  }

  private becomeFollower(term: number) {
    if (this.state !== NodeState.FOLLOWER || term > this.currentTerm) {
      console.log(`Node ${this.nodeId} becoming follower for term ${term}`);
      this.state = NodeState.FOLLOWER;
      this.currentTerm = term;
      this.votedFor = null;
      this.resetElectionTimeout();
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
      if (this.leaderStepDownTimeout) {
        clearTimeout(this.leaderStepDownTimeout);
      }
    }
  }

  private sendHeartbeat() {
    this.nodes.forEach(node => {
      if (node !== this.nodeId) {
        this.emit('appendEntries', {
          term: this.currentTerm,
          leaderId: this.nodeId,
          prevLogIndex: this.log.length - 1,
          prevLogTerm: this.log.length > 0 ? this.log[this.log.length - 1].term : 0,
          entries: [],
          leaderCommit: this.commitIndex
        }, (response: { term: number, success: boolean }) => {
          if (response.term > this.currentTerm) {
            this.becomeFollower(response.term);
          } else if (this.state === NodeState.LEADER) {
            this.resetLeaderStepDownTimeout();
          }
        });
      }
    });
  }

  public appendEntries(args: {
    term: number,
    leaderId: string,
    prevLogIndex: number,
    prevLogTerm: number,
    entries: LogEntry[],
    leaderCommit: number
  }, callback: (response: { term: number, success: boolean }) => void) {
    if (args.term < this.currentTerm) {
      callback({ term: this.currentTerm, success: false });
      return;
    }

    this.resetElectionTimeout();

    if (args.term > this.currentTerm) {
      this.becomeFollower(args.term);
    }

    if (this.log.length < args.prevLogIndex || 
        (args.prevLogIndex >= 0 && this.log[args.prevLogIndex].term !== args.prevLogTerm)) {
      callback({ term: this.currentTerm, success: false });
      return;
    }

    // Append new entries
    for (let i = 0; i < args.entries.length; i++) {
      if (args.prevLogIndex + 1 + i < this.log.length) {
        if (this.log[args.prevLogIndex + 1 + i].term !== args.entries[i].term) {
          this.log.splice(args.prevLogIndex + 1 + i);
          this.log.push(args.entries[i]);
        }
      } else {
        this.log.push(args.entries[i]);
      }
    }

    if (args.leaderCommit > this.commitIndex) {
      const lastNewIndex = args.prevLogIndex + args.entries.length;
      this.commitIndex = Math.min(args.leaderCommit, lastNewIndex);
      this.applyLogEntries();
    }

    callback({ term: this.currentTerm, success: true });
  }

  private applyLogEntries() {
    while (this.lastApplied < this.commitIndex) {
      this.lastApplied++;
      const entry = this.log[this.lastApplied];
      this.emit('newLogEntry', entry);
    }
  }

  public requestVote(args: {
    term: number,
    candidateId: string,
    lastLogIndex: number,
    lastLogTerm: number
  }, callback: (response: { term: number, voteGranted: boolean }) => void) {
    console.log(`Node ${this.nodeId} received vote request from ${args.candidateId} for term ${args.term}`);
    
    if (args.term < this.currentTerm) {
      callback({ term: this.currentTerm, voteGranted: false });
      return;
    }

    if (args.term > this.currentTerm) {
      this.becomeFollower(args.term);
    }

    const lastLogTerm = this.log.length > 0 ? this.log[this.log.length - 1].term : 0;
    const lastLogIndex = this.log.length - 1;

    if ((this.votedFor === null || this.votedFor === args.candidateId) &&
        (args.lastLogTerm > lastLogTerm ||
         (args.lastLogTerm === lastLogTerm && args.lastLogIndex >= lastLogIndex))) {
      this.votedFor = args.candidateId;
      this.resetElectionTimeout();
      console.log(`Node ${this.nodeId} granted vote to ${args.candidateId} for term ${args.term}`);
      callback({ term: this.currentTerm, voteGranted: true });
    } else {
      console.log(`Node ${this.nodeId} denied vote to ${args.candidateId} for term ${args.term}`);
      callback({ term: this.currentTerm, voteGranted: false });
    }
  }

  public clientRequest(command: string, callback: (success: boolean) => void) {
    if (this.state !== NodeState.LEADER) {
      callback(false);
      return;
    }

    const entry: LogEntry = { term: this.currentTerm, command };
    this.log.push(entry);
    
    let replicatedCount = 1;
    const replicationCallback = (success: boolean) => {
      if (success) {
        replicatedCount++;
        if (replicatedCount > this.nodes.length / 2) {
          this.commitIndex = this.log.length - 1;
          this.applyLogEntries();
          callback(true);
        }
      }
    };

    this.nodes.forEach(node => {
      if (node !== this.nodeId) {
        this.emit('appendEntries', {
          term: this.currentTerm,
          leaderId: this.nodeId,
          prevLogIndex: this.log.length - 2,
          prevLogTerm: this.log.length > 1 ? this.log[this.log.length - 2].term : 0,
          entries: [entry],
          leaderCommit: this.commitIndex
        }, (response: { term: number, success: boolean }) => {
          if (response.term > this.currentTerm) {
            this.becomeFollower(response.term);
          } else {
            replicationCallback(response.success);
          }
        });
      }
    });

    // If we're the only node, commit immediately
    if (this.nodes.length === 1) {
      this.commitIndex = this.log.length - 1;
      this.applyLogEntries();
      callback(true);
    }
  }

  public cleanup(): void {
    if (this.electionTimeout) {
      clearTimeout(this.electionTimeout);
      this.electionTimeout = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.leaderStepDownTimeout) {
      clearTimeout(this.leaderStepDownTimeout);
      this.leaderStepDownTimeout = null;
    }
  }
}

