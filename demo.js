import { ServerNode } from './src/server';
import { Client } from './src/client';

// Set up server nodes
const nodes = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];
const servers = nodes.map((url, index) => new ServerNode(`node${index + 1}`, nodes, 3000 + index));

// Create a client
const client = new Client(nodes);

// Helper function to wait for a specified time
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runDemo() {
  try {
    console.log("Setting initial value...");
    await client.set("myKey", "initialValue");
    console.log("Initial value set.");

    console.log("Reading value...");
    let value = await client.get("myKey");
    console.log("Value:", value);

    console.log("Updating value...");
    await client.set("myKey", "updatedValue");
    value = await client.get("myKey");
    console.log("Updated value:", value);

    console.log("Simulating leader failure...");
    // Assume the first server is the leader and "crash" it
    servers[0].close();
    await wait(2000); // Wait for new leader election

    console.log("Trying to read value after leader failure...");
    value = await client.get("myKey");
    console.log("Value after leader failure:", value);

    console.log("Setting new value after leader failure...");
    await client.set("newKey", "newValue");
    value = await client.get("newKey");
    console.log("New value set after leader failure:", value);

    console.log("Demo completed successfully!");
  } catch (error) {
    console.error("An error occurred during the demo:", error);
  } finally {
    // Clean up: close all servers
    servers.forEach(server => server.close());
  }
}

runDemo();