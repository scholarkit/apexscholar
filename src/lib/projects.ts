import { puterService } from './puter';

export interface Project {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    lastAccessed: string;
}

const PROJECTS_KEY = 'research_projects';

export const projectService = {
    async getProjects(): Promise<Project[]> {
        const projects = await puterService.kvGet(PROJECTS_KEY);
        return projects || [];
    },

    async getProject(id: string): Promise<Project | null> {
        const projects = await this.getProjects();
        return projects.find(p => p.id === id) || null;
    },

    async createProject(name: string, description: string): Promise<Project> {
        const newProject: Project = {
            id: Math.random().toString(36).substring(7),
            name,
            description,
            createdAt: new Date().toISOString(),
            lastAccessed: new Date().toISOString(),
        };
        const projects = await this.getProjects();
        await puterService.kvSet(PROJECTS_KEY, [newProject, ...projects]);
        return newProject;
    },

    async updateProjectAccess(id: string): Promise<void> {
        const projects = await this.getProjects();
        const updated = projects.map(p =>
            p.id === id ? { ...p, lastAccessed: new Date().toISOString() } : p
        );
        // Sort by last accessed descending
        updated.sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime());
        await puterService.kvSet(PROJECTS_KEY, updated);
    },

    async deleteProject(id: string): Promise<void> {
        const projects = await this.getProjects();
        const updated = projects.filter(p => p.id !== id);
        await puterService.kvSet(PROJECTS_KEY, updated);
        // Note: We might also want to delete all entries, resources, etc., associated with this project 
        // to prevent orphaned data, but leaving it as simple filtering for now.
    }
};
