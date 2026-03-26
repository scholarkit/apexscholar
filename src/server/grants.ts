import { Router } from 'express';
import { supabaseAdmin } from './supabase.ts';
import { requireAuth } from './middleware.ts';

export const grantRouter = Router();

grantRouter.get('/', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { data, error } = await supabaseAdmin
      .from('grants')
      .select('*')
      .eq('created_by', user.id);
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('Journal get error:', err);
    res.status(500).json({ error: err.message });
  }
});

grantRouter.get('/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const grantId = req.params.id;
    const { data, error } = await supabaseAdmin
      .from('grants')
      .select('*')
      .eq('id', grantId)
      .eq('created_by', user.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('Journal get error:', err);
    res.status(500).json({ error: err.message });
  }
});

grantRouter.post('/', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { data, error } = await supabaseAdmin
      .from('grants')
      .insert({
        created_by: user.id,
        ...req.body,
      })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('Journal post error:', err);
    res.status(500).json({ error: err.message });
  }
});

grantRouter.put('/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { data, error } = await supabaseAdmin
      .from('grants')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('created_by', user.id)
      .select('*')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('Journal put error:', err);
    res.status(500).json({ error: err.message });
  }
});

grantRouter.delete('/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { data, error } = await supabaseAdmin
      .from('grants')
      .delete()
      .eq('id', req.params.id)
      .eq('created_by', user.id)
      .select('*')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('Journal delete error:', err);
    res.status(500).json({ error: err.message });
  }
});
