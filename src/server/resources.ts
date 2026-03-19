import { Router } from 'express';
import { supabaseAdmin } from './supabase.ts';
import { requireAuth } from './middleware.ts';

export const resourcesRouter = Router();

resourcesRouter.get('/', requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        const { data, error } = await supabaseAdmin
            .from('resources')
            .select('*')
            .eq('user_id', user.id)
        if (error) {
            return res.status(500).json({ error: 'Failed to fetch resources' });
        }
        res.json(data);
    } catch (error) {
        console.error('Error fetching resources:', error);
        res.status(500).json({ error: 'Failed to fetch resources' });
    }
})

resourcesRouter.get('/:id', requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        const projectId = req.params.id;
        const { data, error } = await supabaseAdmin
            .from('resources')
            .select('*')
            .eq('project_id', projectId)
            .eq('user_id', user.id)
        if (error) {
            return res.status(500).json({ error: 'Failed to fetch resources' });
        }
        res.json(data);
    } catch (error) {
        console.error('Error fetching resources:', error);
        res.status(500).json({ error: 'Failed to fetch resources' });
    }
})

resourcesRouter.post('/', requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        const { data, error } = await supabaseAdmin
            .from('resources')
            .insert({
                user_id: user.id,
                ...req.body,
            })
            .select('*')
            .single();
        if (error) {
            return res.status(500).json({ error, message: 'Failed to create resource' });
        }
        res.json(data);
    } catch (error) {
        console.error('Error creating resource:', error);
        res.status(500).json({ error, message: 'Failed to create resource' });
    }
})

resourcesRouter.get('/url', requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        const { data, error } = await supabaseAdmin
            .from('resources')
            .select('*')
            .eq('user_id', user.id)
            .eq('type', 'url')
        if (error) {
            return res.status(500).json({ error: 'Failed to fetch resources' });
        }
        res.json(data);
    } catch (error) {
        console.error('Error fetching resources:', error);
        res.status(500).json({ error: 'Failed to fetch resources' });
    }
})

resourcesRouter.delete('/:id', requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        const { id } = req.params;
        const { data, error } = await supabaseAdmin
            .from('resources')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)
            .select('*')
            .single();
        if (error) {
            return res.status(500).json({ error: 'Failed to delete resource' });
        }
        res.json(data);
    } catch (error) {
        console.error('Error deleting resource:', error);
        res.status(500).json({ error: 'Failed to delete resource' });
    }
})

