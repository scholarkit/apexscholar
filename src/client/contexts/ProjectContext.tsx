import React, { createContext, type ReactNode, useContext, useEffect, useState, useCallback, useMemo } from 'react';
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
  createStarterProject: () => Promise<Project>;
  updateProject: (id: string, patch: UpdateProjectPatch) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const projList = await projectService.getProjects();

      // If a user has 0 projects and hasn't explicitly opted out by deleting all projects,
      // auto-provision a starter "General Research" workspace so all modules function out of the box.
      if (projList.length === 0 && !localStorage.getItem('apex_no_auto_project')) {
        try {
          const starter = await projectService.createProject({
            name: 'General Research',
            description: 'Default research workspace for literature, notes, writing, and tasks.',
            tags: ['general', 'research'],
            startDate: new Date().toISOString().split('T')[0],
          });
          setProjects([starter]);
          setActiveProjectState(starter);
          setLoading(false);
          return;
        } catch (starterErr) {
          console.warn('Auto starter project creation failed, using empty project list:', starterErr);
        }
      }

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
  }, [activeProject]);

  useEffect(() => {
    fetchProjects();
  }, []);

  const setActiveProject = useCallback(async (project: Project) => {
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
  }, []);

  const createProject = useCallback(async (input: CreateProjectInput) => {
    localStorage.removeItem('apex_no_auto_project');
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
  }, [fetchProjects, setActiveProject]);

  const createStarterProject = useCallback(async () => {
    localStorage.removeItem('apex_no_auto_project');
    return await createProject({
      name: 'General Research',
      description: 'Default research workspace for literature, notes, writing, and tasks.',
      tags: ['general', 'research'],
      startDate: new Date().toISOString().split('T')[0],
    });
  }, [createProject]);

  const updateProject = useCallback(async (id: string, patch: UpdateProjectPatch) => {
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
  }, [activeProject, fetchProjects]);

  const deleteProject = useCallback(async (id: string) => {
    await projectService.deleteProject(id);

    if (activeProject?.id === id) {
      setActiveProjectState(null);
    }

    // If user deleted their last project, respect their action and don't auto-create immediately
    if (projects.length <= 1) {
      localStorage.setItem('apex_no_auto_project', 'true');
    }

    await fetchProjects();

    // Track project deletion in memory
    supermemory.addMemory(`[project] delete: projectId=${id}`, {
      module: 'project',
      action: 'delete',
      projectId: id,
    });
  }, [activeProject, projects.length, fetchProjects]);

  const activeProjectRole: 'owner' | 'editor' | 'viewer' =
    activeProject?._role || 'owner';
  const isViewer = activeProjectRole === 'viewer';

  const contextValue = useMemo(() => ({
    activeProject,
    projects,
    activeProjectRole,
    isViewer,
    loading,
    setActiveProject,
    refreshProjects: fetchProjects,
    createProject,
    createStarterProject,
    updateProject,
    deleteProject,
  }), [
    activeProject, projects, activeProjectRole, isViewer, loading,
    setActiveProject, fetchProjects, createProject, createStarterProject, updateProject, deleteProject
  ]);

  return (
    <ProjectContext.Provider value={contextValue}>
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
