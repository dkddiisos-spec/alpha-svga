
import { SiteConfig, Product, Category, Order, LicenseKey, UserStats } from '../types';

const API_URL = '/api';

async function callApi(action: string, method: 'GET' | 'POST' = 'GET', body?: any) {
  const url = `${API_URL}/index.php?action=${action}${method === 'GET' && body?.deviceId ? `&deviceId=${body.deviceId}` : ''}`;
  
  try {
    const response = await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: method === 'POST' ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result;
  } catch (error: any) {
    console.error(`Request Failed [${action}]:`, error);
    throw error;
  }
}

export const apiService = {
  getConfig: (): Promise<SiteConfig> => callApi('getConfig'),
  updateConfig: (config: SiteConfig) => callApi('updateConfig', 'POST', config),

  getCategories: (): Promise<Category[]> => callApi('getCategories'),
  addCategory: (cat: Category) => callApi('addCategory', 'POST', cat),
  deleteCategory: (id: string) => callApi('deleteCategory', 'POST', { id }),
  
  getProducts: (): Promise<Product[]> => callApi('getProducts'),
  addProduct: (prod: Product) => callApi('addProduct', 'POST', prod),
  deleteProduct: (id: string) => callApi('deleteProduct', 'POST', { id }),

  getOrders: (): Promise<Order[]> => callApi('getOrders'),
  addOrder: (order: Order) => callApi('addOrder', 'POST', order),
  approveOrder: (id: string) => callApi('approveOrder', 'POST', { id }),
  markDownloaded: (id: string) => callApi('markDownloaded', 'POST', { id }),
  deleteOrder: (id: string) => callApi('deleteOrder', 'POST', { id }),

  getKeys: (): Promise<LicenseKey[]> => callApi('getKeys'),
  addKey: (key: LicenseKey) => callApi('addKey', 'POST', key),
  activateKey: (key: string, deviceId: string, expiresAt: number) => 
    callApi('activateKey', 'POST', { key, deviceId, expiresAt }),
  deleteKey: (id: string) => callApi('deleteKey', 'POST', { id }),

  // تتبع وبصمة الجهاز
  getUserStats: (deviceId: string): Promise<UserStats> => callApi('getUserStats', 'GET', { deviceId }),
  getUsers: (): Promise<UserStats[]> => callApi('getUsers'),
  resetTrial: (deviceId: string) => callApi('resetTrial', 'POST', { deviceId }),
  startTrial: (deviceId: string) => callApi('startTrial', 'POST', { deviceId }),
  trackActivity: (deviceId: string) => callApi('trackActivity', 'POST', { deviceId }),

  uploadFile: async (base64: string, folder: string = 'mido_store') => {
    return callApi('upload', 'POST', { file: base64, folder });
  }
};
