import axios, { AxiosError } from 'axios';

export class Client {
  private servers: string[];
  private currentLeader: number;

  constructor(servers: string[]) {
    this.servers = servers;
    this.currentLeader = 0;
  }

  private async sendRequest<T>(method: string, path: string, data?: any): Promise<T> {
    let lastError: AxiosError | null = null;

    for (let i = 0; i < this.servers.length; i++) {
      const serverIndex = (this.currentLeader + i) % this.servers.length;
      const server = this.servers[serverIndex];
  
      try {
        console.log(`Attempting ${method} request to ${server}${path}`);
        const response = await axios({
          method: method as any,
          url: `${server}${path}`,
          data: data,
          timeout: 5000, // 5 second timeout
          validateStatus: (status) => status < 500 // Accept 404 responses
        });
        
        this.currentLeader = serverIndex;
        return response.data;
      } catch (error) {
        lastError = error as AxiosError;
        console.error(`Error contacting server ${server}:`, lastError.message);
        if (lastError.response) {
          console.error(`Status: ${lastError.response.status}, Data:`, lastError.response.data);
        }
        
        if (i === this.servers.length - 1) {
          throw lastError;
        }
      }
    }
    
    throw lastError || new Error('Failed to contact any server');
  }

  public async get(key: string): Promise<string | undefined> {
    try {
      const response = await this.sendRequest<{ value: string }>('get', `/${key}`);
      return response.value;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        return undefined;
      }
      throw error;
    }
  }

  public async set(key: string, value: string): Promise<void> {
    await this.sendRequest<{ message: string }>('put', `/${key}`, { value });
  }

  public async delete(key: string): Promise<void> {
    await this.sendRequest<{ message: string }>('delete', `/${key}`);
  }

  public async clear(): Promise<void> {
    await this.sendRequest<{ message: string }>('post', '/clear');
  }
}

