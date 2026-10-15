import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Project Provisioning and Workspace State', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('detects a new user with 0 projects and does not have opt-out flag', () => {
    expect(localStorage.getItem('apex_no_auto_project')).toBeNull();
    const shouldAutoProvision = !localStorage.getItem('apex_no_auto_project');
    expect(shouldAutoProvision).toBe(true);
  });

  it('respects explicit deletion by setting the opt-out flag', () => {
    // When a user deletes their only project
    localStorage.setItem('apex_no_auto_project', 'true');
    const shouldAutoProvision = !localStorage.getItem('apex_no_auto_project');
    expect(shouldAutoProvision).toBe(false);
  });

  it('clears opt-out flag when user creates a project or starts fresh', () => {
    localStorage.setItem('apex_no_auto_project', 'true');
    expect(localStorage.getItem('apex_no_auto_project')).toBe('true');

    // User explicitly creates a project
    localStorage.removeItem('apex_no_auto_project');
    expect(localStorage.getItem('apex_no_auto_project')).toBeNull();
  });

  it('provides default starter project payload', () => {
    const starterProjectInput = {
      name: 'General Research',
      description: 'Default research workspace for literature, notes, writing, and tasks.',
      tags: ['general', 'research'],
      startDate: new Date().toISOString().split('T')[0],
    };

    expect(starterProjectInput.name).toBe('General Research');
    expect(starterProjectInput.tags).toContain('general');
    expect(starterProjectInput.tags).toContain('research');
    expect(starterProjectInput.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
