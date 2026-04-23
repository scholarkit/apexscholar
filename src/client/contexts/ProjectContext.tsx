import React, { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { type CreateProjectInput, type Project, projectService, type UpdateProjectPatch } from '../lib/projects';
import { supermemory } from '../lib/supermemory';

interface ProjectContextType {
  activeProject: Project | null;
  projects: Project[];
  /** The current user's role on the active project */
  activeProjectRole: 'owner' | 'editor' | 'viewer';
  /** Convenience: true when the user is a viewer on the active project */
  isViewer: boolean;
  loading: boolean;
  setActiveProject: (project: Project) => void;
  refreshProjects: () => Promise<void>;
  createProject: (input: CreateProjectInput) => Promise<Project>;
  updateProject: (id: string, patch: UpdateProjectPatch) => Promise<void>;
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
        const sorted = [...projList].sort(
          (a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
        );
        setActiveProjectState(sorted[0]);
      } else if (activeProject) {
        // Ensure activeProject still exists
        const exists = projList.find((p) => p.id === activeProject.id);
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

    // Track project activation in memory
    supermemory.addMemory(
      `[project] activate: projectId=${project.id}, projectName=${project.name}`,
      {
        module: 'project',
        action: 'activate',
        projectId: project.id,
        projectName: project.name,
      }
    );
  };

  const createProject = async (input: CreateProjectInput) => {
    const proj = await projectService.createProject(input);
    await fetchProjects();
    await setActiveProject(proj);

    // Track project creation in memory
    supermemory.addMemory(
      `[project] create: projectName=${input.name}, tags=${JSON.stringify(input.tags)}, startDate=${input.startDate}`,
      {
        module: 'project',
        action: 'create',
        projectName: input.name,
        tags: input.tags,
        startDate: input.startDate,
      }
    );

    return proj;
  };

  const updateProject = async (id: string, patch: UpdateProjectPatch) => {
    const updated = await projectService.updateProject(id, patch);
    if (activeProject?.id === id) {
      setActiveProjectState(updated);
    }
    await fetchProjects();

    // Track project update in memory
    supermemory.addMemory(
      `[project] update: projectId=${id}, updatedFields=${JSON.stringify(Object.keys(patch))}`,
      {
        module: 'project',
        action: 'update',
        projectId: id,
        updatedFields: Object.keys(patch),
      }
    );
  };

  const deleteProject = async (id: string) => {
    await projectService.deleteProject(id);

    if (activeProject?.id === id) {
      setActiveProjectState(null);
    }

    await fetchProjects();

    // Track project deletion in memory
    supermemory.addMemory(`[project] delete: projectId=${id}`, {
      module: 'project',
      action: 'delete',
      projectId: id,
    });
  };

  const activeProjectRole: 'owner' | 'editor' | 'viewer' =
    activeProject?._role || 'owner';
  const isViewer = activeProjectRole === 'viewer';

  return (
    <ProjectContext.Provider
      value={{
        activeProject,
        projects,
        activeProjectRole,
        isViewer,
        loading,
        setActiveProject,
        refreshProjects: fetchProjects,
        createProject,
        updateProject,
        deleteProject,
      }}
    >
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
