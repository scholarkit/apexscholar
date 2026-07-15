import { apiFetch } from './apiFetch';

const kanbanUrl = '/api/kanban';
const timetableUrl = '/api/timetable';

export interface KanbanCard {
  id: string;
  project_id?: string;
  column_id: 'pending' | 'in_progress' | 'completed';
  content: string;
  deadline?: string;
  estimated_minutes?: number;
  source_type?: string;
  source_ref_id?: string;
  created_at: string;
  projects?: { name: string };
}

export const kanbanService = {
  async getGlobalCards(): Promise<KanbanCard[]> {
    const res = await apiFetch(`${kanbanUrl}/global`);
    if (!res.ok) throw new Error('Failed to fetch global kanban cards');
    return res.json();
  },

  async createCard(card: Partial<KanbanCard>): Promise<KanbanCard> {
    const res = await apiFetch(kanbanUrl, {
      method: 'POST',
      body: JSON.stringify(card),
    });
    if (!res.ok) throw new Error('Failed to create card');
    return res.json();
  },

  async updateCard(id: string, updates: Partial<KanbanCard>): Promise<KanbanCard> {
    const res = await apiFetch(`${kanbanUrl}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update card');
    return res.json();
  },

  async deleteCard(id: string): Promise<void> {
    const res = await apiFetch(`${kanbanUrl}/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete card');
  }
};

export interface AvailabilityProfile {
  weekday_minutes: number;
  weekend_minutes: number;
  blocked_slots: any[];
}

export interface ScheduledBlock {
  id: string;
  kanban_card_id: string;
  date: string;
  duration_minutes: number;
  status: string;
  kanban_cards?: {
    content: string;
    project_id: string;
    projects?: { name: string };
  };
}

export const timetableService = {
  async getAvailability(): Promise<AvailabilityProfile> {
    const res = await apiFetch(`${timetableUrl}/availability`);
    if (!res.ok) throw new Error('Failed to fetch availability');
    return res.json();
  },

  async updateAvailability(profile: Partial<AvailabilityProfile>): Promise<AvailabilityProfile> {
    const res = await apiFetch(`${timetableUrl}/availability`, {
      method: 'POST',
      body: JSON.stringify(profile),
    });
    if (!res.ok) throw new Error('Failed to update availability');
    return res.json();
  },

  async getBlocks(): Promise<ScheduledBlock[]> {
    const res = await apiFetch(timetableUrl);
    if (!res.ok) throw new Error('Failed to fetch blocks');
    return res.json();
  },

  async regenerate(): Promise<{ success: boolean; generatedBlocks: number }> {
    const res = await apiFetch(`${timetableUrl}/regenerate`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to regenerate timetable');
    return res.json();
  }
};

export const pushService = {
  async subscribe(subscription: PushSubscription): Promise<void> {
    const res = await apiFetch('/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription),
    });
    if (!res.ok) throw new Error('Failed to subscribe to push');
  }
};
