export class KeyValueStore {
    private store: Map<string, string>;
  
    constructor() {
      this.store = new Map();
    }
  
    public get(key: string): string | undefined {
      return this.store.get(key);
    }
  
    public set(key: string, value: string): void {
      this.store.set(key, value);
    }
  
    public delete(key: string): boolean {
      return this.store.delete(key);
    }
  
    public clear(): void {
      this.store.clear();
    }
  }
  
  