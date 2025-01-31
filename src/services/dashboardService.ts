import { Dashboard, DashboardWidget } from "@/types/dashboard";
import { v4 as uuidv4 } from 'uuid';

let db: IDBDatabase;

const initDB = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('dashboardDB', 1);

    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      db = request.result;
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('dashboards')) {
        db.createObjectStore('dashboards', { keyPath: 'id' });
      }
    };
  });
};

export const createDashboard = async (name: string, description?: string): Promise<Dashboard> => {
  if (!db) await initDB();
  
  const dashboard: Dashboard = {
    id: uuidv4(),
    name,
    description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    widgets: [],
    layout: 'grid',
    theme: 'system'
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('dashboards', 'readwrite');
    const store = transaction.objectStore('dashboards');
    const request = store.add(dashboard);

    request.onsuccess = () => resolve(dashboard);
    request.onerror = () => reject(request.error);
  });
};

export const getDashboard = async (id: string): Promise<Dashboard | null> => {
  if (!db) await initDB();

  return new Promise((resolve) => {
    const transaction = db.transaction('dashboards', 'readonly');
    const store = transaction.objectStore('dashboards');
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
};

export const getAllDashboards = async (): Promise<Dashboard[]> => {
  if (!db) await initDB();

  return new Promise((resolve) => {
    const transaction = db.transaction('dashboards', 'readonly');
    const store = transaction.objectStore('dashboards');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve([]);
  });
};

export const updateDashboard = async (dashboard: Dashboard): Promise<boolean> => {
  if (!db) await initDB();

  return new Promise((resolve) => {
    const transaction = db.transaction('dashboards', 'readwrite');
    const store = transaction.objectStore('dashboards');
    const request = store.put({
      ...dashboard,
      updatedAt: new Date().toISOString()
    });

    request.onsuccess = () => resolve(true);
    request.onerror = () => resolve(false);
  });
};

export const deleteDashboard = async (id: string): Promise<boolean> => {
  if (!db) await initDB();

  return new Promise((resolve) => {
    const transaction = db.transaction('dashboards', 'readwrite');
    const store = transaction.objectStore('dashboards');
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => resolve(false);
  });
};

// Initialize database when module loads
initDB().catch(console.error);