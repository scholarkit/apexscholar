import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Project, projectService } from '../lib/projects';

interface ProjectContextType {
    activeProject: Project | null;
    projects: Project[];
    loading: boolean;
    setActiveProject: (project: Project) => void;
    refreshProjects: () => Promise<void>;
    createProject: (name: string, description: string) => Promise<Project>;
    deleteProject: (id: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
    const [activeProject, setActiveProjectState] = useState<Project | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const projList = await projectService.getProjects();
            setProjects(projList);

            // Auto-select the last accessed project if none is selected
            if (!activeProject && projList.length > 0) {
                // Assume sorted by lastAccessed from DB or sort here
                const sorted = [...projList].sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime());
                setActiveProjectState(sorted[0]);
            } else if (activeProject) {
                // Ensure activeProject still exists
                const exists = projList.find(p => p.id === activeProject.id);
                if (!exists) setActiveProjectState(projList[0] || null);
            }
        } catch (e) {
            console.error('Failed to load projects', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const setActiveProject = async (project: Project) => {
        setActiveProjectState(project);
        await projectService.updateProjectAccess(project.id);
        // Refresh to get updated sort order
        const updated = await projectService.getProjects();
        setProjects(updated);
    };

    const createProject = async (name: string, description: string) => {
        const proj = await projectService.createProject(name, description);
        await fetchProjects();
        await setActiveProject(proj);
        return proj;
    };

    const deleteProject = async (id: string) => {
        await projectService.deleteProject(id);

        if (activeProject?.id === id) {
            setActiveProjectState(null);
        }

        await fetchProjects();
    };

    return (
        <ProjectContext.Provider value={{
            activeProject,
            projects,
            loading,
            setActiveProject,
            refreshProjects: fetchProjects,
            createProject,
            deleteProject
        }}>
            {children}
        </ProjectContext.Provider>
    );
}

export function useProject() {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
}
