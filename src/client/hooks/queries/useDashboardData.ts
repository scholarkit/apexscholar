import { useQuery } from '@tanstack/react-query';
import { journalService } from '@/client/lib/journal';
import { resourcesService } from '@/client/lib/resources';
import { projectService } from '@/client/lib/projects';

export function useDashboardData() {
  const entriesQuery = useQuery({
    queryKey: ['journal', 'entries'],
    queryFn: () => journalService.getEntries(),
  });

  const resourcesCountQuery = useQuery({
    queryKey: ['resources', 'count'],
    queryFn: () => resourcesService.getCount(),
  });

  const projectsCountQuery = useQuery({
    queryKey: ['projects', 'count'],
    queryFn: () => projectService.getCount(),
  });

  const isLoading =
    entriesQuery.isLoading || resourcesCountQuery.isLoading || projectsCountQuery.isLoading;

  return {
    entries: entriesQuery.data ?? [],
    resourcesCount: resourcesCountQuery.data ?? 0,
    projectsCount: projectsCountQuery.data ?? 0,
    isLoading,
    isError: entriesQuery.isError || resourcesCountQuery.isError || projectsCountQuery.isError,
    error: entriesQuery.error || resourcesCountQuery.error || projectsCountQuery.error,
  };
}
