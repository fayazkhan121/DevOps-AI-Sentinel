import { PlatformMetric } from './platformMetrics';

const DB_NAME = 'metricsDB';
const DB_VERSION = 1;

let db: IDBDatabase;

const initDB = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      db = request.result;
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create metrics store
      if (!db.objectStoreNames.contains('metrics')) {
        db.createObjectStore('metrics', { keyPath: 'id', autoIncrement: true });
      }

      // Create settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      // Create service status store
      if (!db.objectStoreNames.contains('service_status')) {
        db.createObjectStore('service_status', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

export const saveMetric = async (metric: PlatformMetric): Promise<boolean> => {
  if (!db) await initDB();
  
  return new Promise((resolve) => {
    const transaction = db.transaction('metrics', 'readwrite');
    const store = transaction.objectStore('metrics');
    
    const request = store.add(metric);
    
    request.onsuccess = () => {
      console.log('Metric saved successfully:', metric);
      resolve(true);
    };
    
    request.onerror = () => {
      console.error('Error saving metric:', request.error);
      resolve(false);
    };
  });
};

export const getMetrics = async (): Promise<PlatformMetric[]> => {
  if (!db) await initDB();
  
  return new Promise((resolve) => {
    const transaction = db.transaction('metrics', 'readonly');
    const store = transaction.objectStore('metrics');
    const request = store.getAll();
    
    request.onsuccess = () => {
      resolve(request.result.slice(-100)); // Get last 100 metrics
    };
    
    request.onerror = () => {
      console.error('Error fetching metrics:', request.error);
      resolve([]);
    };
  });
};

export const saveSetting = async (key: string, value: any): Promise<boolean> => {
  if (!db) await initDB();
  
  return new Promise((resolve) => {
    const transaction = db.transaction('settings', 'readwrite');
    const store = transaction.objectStore('settings');
    
    const request = store.put({
      key,
      value: JSON.stringify(value)
    });
    
    request.onsuccess = () => {
      console.log(`Setting saved successfully: ${key}`);
      resolve(true);
    };
    
    request.onerror = () => {
      console.error('Error saving setting:', request.error);
      resolve(false);
    };
  });
};

export const getSetting = async (key: string): Promise<any> => {
  if (!db) await initDB();
  
  return new Promise((resolve) => {
    const transaction = db.transaction('settings', 'readonly');
    const store = transaction.objectStore('settings');
    const request = store.get(key);
    
    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? JSON.parse(result.value) : null);
    };
    
    request.onerror = () => {
      console.error('Error fetching setting:', request.error);
      resolve(null);
    };
  });
};

// Initialize database when module loads
initDB().catch(console.error);