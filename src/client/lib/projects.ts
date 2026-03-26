import { kv } from './kv';

const provider = import.meta.env.VITE_PROVIDER;

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  tags: string[];
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
}

export type CreateProjectInput = {
  name: string;
  description?: string;
  tags?: string[];
  startDate?: string | null;
};

export type UpdateProjectPatch = Partial<
  Pick<Project, 'name' | 'description' | 'tags' | 'status' | 'start_date' | 'end_date'>
>;

const PROJECTS_KEY = 'research_projects';
const baseUrl = '/api/projects';

export const projectService = {
  async getCount(): Promise<number> {
    if (provider === 'supabase') {
      const token = localStorage.getItem('supabase_token');
      const res = await fetch(`${baseUrl}/count`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count || 0;
    }
    const projects = await kv.get(PROJECTS_KEY);
    return (projects || []).length;
  },

  async getProjects(): Promise<Project[]> {
    if (provider === 'supabase') {
      const token = localStorage.getItem('supabase_token');
      const res = await fetch(baseUrl, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      return res.json() || [];
    }
    const projects = await kv.get(PROJECTS_KEY);
    return projects || [];
  },

  async getProject(id: string): Promise<Project | null> {
    if (provider === 'supabase') {
      const token = localStorage.getItem('supabase_token');
      const res = await fetch(`${baseUrl}/${id}`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      return res.json() || null;
    }
    const projects = await this.getProjects();
    return projects.find((p) => p.id === id) || null;
  },

  async createProject(input: CreateProjectInput): Promise<Project> {
    const user = JSON.parse(localStorage.getItem('supabase_user') || '{}');
    const token = localStorage.getItem('supabase_token');
    const newProject: any = {
      owner_id: user.id,
      name: input.name,
      description: input.description || '',
      tags: input.tags || [],
      status: 'draft',
      start_date: input.startDate || null,
      end_date: null,
      created_at: new Date().toISOString(),
    };
    if (provider === 'supabase') {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(newProject),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create project');
      }
      const result = await res.json();
      return result;
    }
    // Fallback for non-supabase provider
    const projects = await this.getProjects();
    const withId = {
      ...newProject,
      id: Math.random().toString(36).substring(2, 11),
    };
    await kv.set(PROJECTS_KEY, [withId, ...projects]);
    return withId;
  },

  async updateProjectAccess(id: string): Promise<void> {
    const projects = await this.getProjects();
    const updated = projects.map((p) =>
      p.id === id ? { ...p, lastAccessed: new Date().toISOString() } : p
    );
    // Sort by last accessed descending
    updated.sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime());
    await kv.set(PROJECTS_KEY, updated);
  },

  async updateProject(id: string, patch: UpdateProjectPatch): Promise<Project> {
    if (provider === 'supabase') {
      const token = localStorage.getItem('supabase_token');
      const res = await fetch(`${baseUrl}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(patch),
      });
      const result = await res.json();
      return result && Array.isArray(result) ? result[0] : result || patch;
    }
    const projects = await this.getProjects();
    const updated = projects.map((p) => (p.id === id ? { ...p, ...patch } : p));
    await kv.set(PROJECTS_KEY, updated);
    return updated.find((p) => p.id === id)!;
  },

  async deleteProject(id: string): Promise<void> {
    if (provider === 'supabase') {
      const token = localStorage.getItem('supabase_token');
      const res = await fetch(`${baseUrl}/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      return res.json() || null;
    }
    const projects = await this.getProjects();
    const updated = projects.filter((p) => p.id !== id);
    await kv.set(PROJECTS_KEY, updated);
  },
};
