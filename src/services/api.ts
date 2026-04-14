import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/config';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

class APIService {
  private baseURL: string;
  private token: string | null = null;
  private readonly TOKEN_KEY = '@calendar_vee_token';
  // Resolves once the token has been loaded from AsyncStorage
  private ready: Promise<void>;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.ready = this.loadToken();
  }

  private async loadToken(): Promise<void> {
    try {
      this.token = await AsyncStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Failed to load token from AsyncStorage:', error);
    }
  }

  // Waits until the token has been loaded, then returns it
  async getTokenAsync(): Promise<string | null> {
    await this.ready;
    return this.token;
  }

  private async saveToken(token: string): Promise<void> {
    try {
      this.token = token;
      await AsyncStorage.setItem(this.TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to save token to AsyncStorage:', error);
    }
  }

  private async clearToken(): Promise<void> {
    try {
      this.token = null;
      await AsyncStorage.removeItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Failed to clear token from AsyncStorage:', error);
    }
  }

  private getHeaders(skipAuth: boolean = false): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (!skipAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    // Ensure token is loaded from AsyncStorage before making any request
    await this.ready;

    const { skipAuth = false, ...fetchOptions } = options;
    const url = `${this.baseURL}${endpoint}`;
    const headers = this.getHeaders(skipAuth);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          ...headers,
          ...fetchOptions.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Auth endpoints
  async loginAdmin(
    username: string,
    password: string
  ): Promise<{ token: string }> {
    const response = await this.request<{ token: string }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ username, password }),
        skipAuth: true,
      }
    );
    await this.saveToken(response.token);
    return response;
  }

  async loginPin(username: string, pin: string): Promise<{ token: string }> {
    const response = await this.request<{ token: string }>(
      '/api/auth/pin',
      {
        method: 'POST',
        body: JSON.stringify({ username, pin }),
        skipAuth: true,
      }
    );
    await this.saveToken(response.token);
    return response;
  }

  async verifyAuth(): Promise<{ valid: boolean; role: string }> {
    return this.request<{ valid: boolean; role: string }>(
      '/api/auth/verify'
    );
  }

  // Event endpoints
  async getEvents(params: {
    start?: string;
    end?: string;
    status?: string;
  }): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (params.start) queryParams.append('start', params.start);
    if (params.end) queryParams.append('end', params.end);
    if (params.status) queryParams.append('status', params.status);

    const query = queryParams.toString();
    return this.request<any[]>(
      `/api/events${query ? '?' + query : ''}`
    );
  }

  async getEvent(id: string): Promise<any> {
    return this.request<any>(`/api/events/${id}`);
  }

  async createEvent(eventData: any): Promise<any> {
    return this.request<any>('/api/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  async updateEvent(id: string, eventData: any): Promise<any> {
    return this.request<any>(`/api/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  }

  async deleteEvent(id: string): Promise<void> {
    await this.request<void>(`/api/events/${id}`, {
      method: 'DELETE',
    });
  }

  async checkEventOverlap(eventData: any): Promise<{ hasOverlap: boolean }> {
    return this.request<{ hasOverlap: boolean }>(
      '/api/events/check-overlap',
      {
        method: 'POST',
        body: JSON.stringify(eventData),
      }
    );
  }

  // Audit log endpoints
  async getAuditLog(params: {
    limit?: number;
    export?: boolean;
  }): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.export) queryParams.append('export', 'true');

    const query = queryParams.toString();
    return this.request<any[]>(
      `/api/audit-log${query ? '?' + query : ''}`
    );
  }

  // Holiday endpoints
  async getHolidays(year?: number): Promise<any[]> {
    const query = year ? `?year=${year}` : '';
    return this.request<any[]>(`/api/holidays${query}`);
  }

  async createHoliday(holidayData: any): Promise<any> {
    return this.request<any>('/api/holidays', {
      method: 'POST',
      body: JSON.stringify(holidayData),
    });
  }

  async updateHoliday(id: string, holidayData: any): Promise<any> {
    return this.request<any>(`/api/holidays/${id}`, {
      method: 'PUT',
      body: JSON.stringify(holidayData),
    });
  }

  async deleteHoliday(id: string): Promise<void> {
    await this.request<void>(`/api/holidays/${id}`, {
      method: 'DELETE',
    });
  }

  async initializeHolidays(): Promise<any> {
    return this.request<any>('/api/holidays/init', {
      method: 'POST',
    });
  }

  // Stats endpoints
  async getStats(): Promise<any> {
    return this.request<any>('/api/stats');
  }

  // Settings endpoints
  async getSettings(): Promise<any> {
    return this.request<any>('/api/settings');
  }

  async updateSettings(settingsData: any): Promise<any> {
    return this.request<any>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsData),
    });
  }

  // AI endpoints
  async getAIStatus(): Promise<{ enabled: boolean }> {
    return this.request<{ enabled: boolean }>('/api/ai/status');
  }

  async chatWithAI(message: string, secretaryId?: string): Promise<any> {
    return this.request<any>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, secretary_id: secretaryId }),
    });
  }

  // Notification endpoints
  async getNotifications(): Promise<any[]> {
    return this.request<any[]>('/api/notifications');
  }

  // Reminder endpoints
  async checkReminders(): Promise<any> {
    return this.request<any>('/api/reminders/check', {
      method: 'POST',
    });
  }

  // Logout
  async logout(): Promise<void> {
    await this.clearToken();
  }

  // Get current token (for debugging or external use)
  getToken(): string | null {
    return this.token;
  }

  // Set token manually (useful for restoring from storage)
  setToken(token: string | null): void {
    this.token = token;
  }
}

// Export singleton instance
export const api = new APIService(API_BASE_URL);

export default api;
