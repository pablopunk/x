// Offline-first storage utility
export class OfflineStorage {
  private static instance: OfflineStorage;
  private isOnline: boolean = navigator.onLine;

  private constructor() {
    this.setupNetworkListeners();
  }

  static getInstance(): OfflineStorage {
    if (!OfflineStorage.instance) {
      OfflineStorage.instance = new OfflineStorage();
    }
    return OfflineStorage.instance;
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncOfflineData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Store data with offline fallback
  async storeData(key: string, data: any): Promise<void> {
    try {
      // Try to store in IndexedDB first
      await this.storeInIndexedDB(key, data);
      
      // If online, also try to sync with server (future feature)
      if (this.isOnline) {
        await this.syncToServer(key, data);
      }
    } catch (error) {
      console.error('Failed to store data:', error);
      // Fallback to localStorage
      this.storeInLocalStorage(key, data);
    }
  }

  // Retrieve data with offline fallback
  async getData(key: string): Promise<any> {
    try {
      // Try IndexedDB first
      const data = await this.getFromIndexedDB(key);
      if (data) return data;
      
      // Fallback to localStorage
      return this.getFromLocalStorage(key);
    } catch (error) {
      console.error('Failed to get data from IndexedDB:', error);
      return this.getFromLocalStorage(key);
    }
  }

  private async storeInIndexedDB(key: string, data: any): Promise<void> {
    // This would use the existing idb-helper.ts functions
    // For now, we'll use a simplified approach
    const db = await this.openDB();
    const transaction = db.transaction(['offline-data'], 'readwrite');
    const store = transaction.objectStore('offline-data');
    
    return new Promise((resolve, reject) => {
      const request = store.put(data, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getFromIndexedDB(key: string): Promise<any> {
    const db = await this.openDB();
    const transaction = db.transaction(['offline-data'], 'readonly');
    const store = transaction.objectStore('offline-data');
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('OfflineStorage', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('offline-data')) {
          db.createObjectStore('offline-data');
        }
      };
    });
  }

  private storeInLocalStorage(key: string, data: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to store in localStorage:', error);
    }
  }

  private getFromLocalStorage(key: string): any {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get from localStorage:', error);
      return null;
    }
  }

  private async syncToServer(key: string, data: any): Promise<void> {
    // Future: Implement server sync when needed
    console.log('Would sync to server:', key, data);
  }

  private async syncOfflineData(): Promise<void> {
    // Future: Sync any offline changes when coming back online
    console.log('Syncing offline data...');
  }

  // Check if we're currently offline
  isOffline(): boolean {
    return !this.isOnline;
  }

  // Get storage usage info
  async getStorageInfo(): Promise<{
    indexedDB: number;
    localStorage: number;
  }> {
    const indexedDBUsage = await this.getIndexedDBUsage();
    const localStorageUsage = this.getLocalStorageUsage();
    
    return {
      indexedDB: indexedDBUsage,
      localStorage: localStorageUsage,
    };
  }

  private async getIndexedDBUsage(): Promise<number> {
    // This is a simplified version - in a real app you'd calculate actual usage
    return 0;
  }

  private getLocalStorageUsage(): number {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  }
} 