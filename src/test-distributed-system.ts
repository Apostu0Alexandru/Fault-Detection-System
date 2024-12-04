import { ServerNode } from './server.js';
import { Client } from './client.js';
import { AxiosError } from 'axios';

const BASE_PORT = 3000;
const NODE_COUNT = 3;

const nodes = Array.from({ length: NODE_COUNT }, (_, i) => `http://localhost:${BASE_PORT + i}`);
const servers: ServerNode[] = [];
const client = new Client(nodes);

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startNodes() {
  // Check if ports are available before starting
  for (let i = 0; i < NODE_COUNT; i++) {
    const port = BASE_PORT + i;
    try {
      const server = new ServerNode(`node${i + 1}`, nodes, port);
      servers.push(server);
      console.log(`Started server node${i + 1} on port ${port}`);
    } catch (error) {
      console.error(`Failed to start node on port ${port}:`, error);
      throw error;
    }
  }
  
  console.log("Waiting for nodes to initialize and elect a leader...");
  await wait(10000);
  console.log("Initialization period complete.");
}

async function stopNodes() {
  for (const server of servers) {
    server.close();
  }
  console.log("All nodes stopped");
}

async function runTest() {
  console.log("Starting distributed system test...");

  try {
    await startNodes();

    // Set initial value
    console.log("\nSetting initial value...");
    try {
      await client.set("testKey", "initialValue");
      console.log("Initial value set successfully.");
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Error setting initial value:", 
        axiosError.response ? `Status: ${axiosError.response.status}` : axiosError.message);
    }

    // Get the value
    console.log("\nReading value...");
    try {
      let value = await client.get("testKey");
      console.log("Value:", value);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Error reading value:", 
        axiosError.response ? `Status: ${axiosError.response.status}` : axiosError.message);
    }

    // Update the value
    console.log("\nUpdating value...");
    try {
      await client.set("testKey", "updatedValue");
      let value = await client.get("testKey");
      console.log("Updated value:", value);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Error updating value:", 
        axiosError.response ? `Status: ${axiosError.response.status}` : axiosError.message);
    }

    // Simulate leader failure
    console.log("\nSimulating leader failure...");
    if (servers[0]) {
      servers[0].close();
      console.log("First node (assumed leader) has been shut down.");
    }

    // Wait for new leader election
    console.log("Waiting for new leader election...");
    await wait(5000);

    // Try to get the value after leader failure
    console.log("\nTrying to read value after leader failure...");
    try {
      let value = await client.get("testKey");
      console.log("Value after leader failure:", value);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Error reading value after leader failure:", 
        axiosError.response ? `Status: ${axiosError.response.status}` : axiosError.message);
    }

    // Set a new value after leader failure
    console.log("\nSetting new value after leader failure...");
    try {
      await client.set("newKey", "newValue");
      let value = await client.get("newKey");
      console.log("New value set after leader failure:", value);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Error setting new value after leader failure:", 
        axiosError.response ? `Status: ${axiosError.response.status}` : axiosError.message);
    }

    console.log("\nTest completed successfully!");
  } catch (error) {
    console.error("An error occurred during the test:", error);
  } finally {
    await stopNodes();
  }
}

runTest().catch(console.error);

