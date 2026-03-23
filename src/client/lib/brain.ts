import { apiFetch } from './apiFetch';

export interface Chat {
    id: string;
    user_id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

export interface Message {
    id: string;
    chat_id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

const getToken = () => localStorage.getItem('supabase_token') || '';

export const brainService = {
    async listChats(): Promise<Chat[]> {
        const res = await apiFetch('/api/brain/chats', {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) throw new Error('Failed to fetch chats');
        return await res.json();
    },

    async createChat(title?: string): Promise<Chat> {
        const res = await apiFetch('/api/brain/chats', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title })
        });
        if (!res.ok) throw new Error('Failed to create chat');
        return await res.json();
    },

    async deleteChat(id: string): Promise<void> {
        const res = await apiFetch(`/api/brain/chats/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) throw new Error('Failed to delete chat');
    },

    async listMessages(chatId: string): Promise<Message[]> {
        const res = await apiFetch(`/api/brain/chats/${chatId}/messages`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) throw new Error('Failed to fetch messages');
        return await res.json();
    },

    async addMessage(chatId: string, role: 'user' | 'assistant', content: string): Promise<Message> {
        const res = await apiFetch(`/api/brain/chats/${chatId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ role, content })
        });
        if (!res.ok) throw new Error('Failed to add message');
        return await res.json();
    }
};
