/**
 * Puter.js Service Layer
 * This module abstracts interactions with Puter.js (Auth, KV, FS).
 */

// Define the global Puter object type since it's loaded via script tag
declare global {
  interface Window {
    puter: any;
  }
}

const puter = window.puter;

export interface PuterUser {
  username: string;
  uuid: string;
}

export interface Entry {
  id: string;
  date: string;
  content: string;
  entry_type: string;
  startDate?: string;
  endDate?: string;
}

export interface Resource {
  id: string;
  name: string;
  type: string;
  path: string;
  date_added: string;
}

export interface Insight {
  id: string;
  content: string;
  created_at: string;
}

export const puterService = {
  /**
   * Authentication
   */
  async isSignedIn(): Promise<boolean> {
    return await puter.auth.isSignedIn();
  },

  async signIn(): Promise<PuterUser | null> {
    try {
      return await puter.auth.signIn();
    } catch (error) {
      console.error('Puter Sign-In Error:', error);
      return null;
    }
  },

  async signOut(): Promise<void> {
    await puter.auth.signOut();
  },

  async getUser(): Promise<PuterUser | null> {
    if (await this.isSignedIn()) {
      return await puter.auth.getUser();
    }
    return null;
  },

  async getMonthlyUsage(): Promise<any> {
    if (await this.isSignedIn() && puter.auth.getMonthlyUsage) {
      return await puter.auth.getMonthlyUsage();
    }
    return null;
  },

  async getDetailedAppUsage(appId: string): Promise<any> {
    if (await this.isSignedIn() && puter.auth.getDetailedAppUsage) {
      return await puter.auth.getDetailedAppUsage(appId);
    }
    return null;
  },

  /**
   * KV Storage
   */
  async kvGet(key: string): Promise<any> {
    const value = await puter.kv.get(key);
    return value ? JSON.parse(value) : null;
  },

  async kvSet(key: string, value: any): Promise<void> {
    await puter.kv.set(key, JSON.stringify(value));
  },

  async kvDelete(key: string): Promise<void> {
    await puter.kv.del(key);
  },

  /**
   * File System
   */
  async fsWrite(path: string, content: any): Promise<void> {
    await puter.fs.write(path, content, { createMissingParents: true });
  },

  async fsRead(path: string): Promise<any> {
    return await puter.fs.read(path);
  },

  async fsDelete(path: string): Promise<void> {
    await puter.fs.delete(path);
  },

  async fsList(path: string): Promise<any[]> {
    return await puter.fs.list(path);
  },

  async fsGetURL(path: string): Promise<string> {
    return await puter.fs.getReadURL(path);
  }
};
