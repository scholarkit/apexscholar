/**
 * Puter.js Service Layer with E2EE Support
 * This module abstracts interactions with Puter.js (Auth, KV, FS).
 * All KV operations are automatically encrypted when E2EE is enabled.
 */

import { auth } from './auth';
import { storage } from './storage';

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

export const puterService = {
  // ... (rest unchanged)
  /**
   * Authentication
   */
  async isSignedIn(): Promise<boolean> {
    return await auth.isSignedIn();
  },

  async signIn(): Promise<PuterUser | null> {
    try {
      return await auth.signIn();
    } catch (error) {
      console.error('Puter Sign-In Error:', error);
      return null;
    }
  },

  async signOut(): Promise<void> {
    await auth.signOut();
  },

  async getUser(): Promise<PuterUser | null> {
    if (await this.isSignedIn()) {
      return await auth.getUser();
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
   * File System
   */
  async fsWrite(path: string, content: any): Promise<void> {
    await storage.write(path, content, { createMissingParents: true });
  },

  async fsRead(path: string): Promise<any> {
    return await storage.read(path);
  },

  async fsDelete(path: string): Promise<void> {
    await storage.delete(path);
  },

  async fsList(path: string): Promise<any[]> {
    return await storage.list(path);
  },

  async fsGetURL(path: string): Promise<string> {
    return await storage.getReadURL(path);
  }
};
