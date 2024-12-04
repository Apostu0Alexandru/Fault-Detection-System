
# Distributed Key-Value Store with Raft Consensus

This project implements a simplified distributed key-value store using the Raft consensus algorithm. It's built with TypeScript and demonstrates core concepts of distributed systems, including leader election, log replication, and fault tolerance.

## Features

- Distributed key-value store with multiple nodes
- Raft consensus algorithm implementation
- Leader election and log replication
- Fault tolerance (continues operating if a minority of nodes fail)
- Simple HTTP API for key-value operations

## Prerequisites

- Node.js (v14 or later)
- npm

## Installation

1. Clone the repository:
```

git clone [https://github.com/yourusername/distributed-key-value-store.git](https://github.com/yourusername/distributed-key-value-store.git)
cd distributed-key-value-store

```plaintext

2. Install dependencies:
```

npm install

```plaintext

## Usage

### Running the Tests

To start the servers and run the test suite:

```

npm test

```plaintext

This will:
- Start multiple server nodes
- Perform basic key-value operations
- Simulate a leader failure
- Verify system recovery and consistency

### Manual Interaction

You can interact with the system manually using HTTP requests. Here are some example cURL commands:

1. Set a value:
```

curl -X PUT -H "Content-Type: application/json" -d '{"value":"exampleValue"}' [http://localhost:3000/exampleKey](http://localhost:3000/exampleKey)

```plaintext

2. Get a value:
```

curl [http://localhost:3000/exampleKey](http://localhost:3000/exampleKey)

```plaintext

3. Delete a value:
```

curl -X DELETE [http://localhost:3000/exampleKey](http://localhost:3000/exampleKey)

```plaintext

4. Clear all values:
```

curl -X POST [http://localhost:3000/clear](http://localhost:3000/clear)

```plaintext

## Project Structure

- `src/server.ts`: Implements the ServerNode class, handling HTTP requests and Raft communication
- `src/raft.ts`: Implements the RaftNode class, the core of the Raft consensus algorithm
- `src/key-value-store.ts`: A simple in-memory key-value store
- `src/client.ts`: A client class for interacting with the distributed system
- `src/test-distributed-system.ts`: Test script demonstrating system functionality

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- The Raft consensus algorithm: https://raft.github.io/
- Inspiration from etcd and other distributed key-value stores

```
