import { Router } from 'express';
import { supabaseAdmin } from './supabase.ts';
import { requireAuth } from './middleware.ts';

export const brainRouter = Router();

// ── Chats ───────────────────────────────────────────────────────────

/** List all chats for the authenticated user */
brainRouter.get('/chats', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { data, error } = await supabaseAdmin
      .from('brain_chats')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('[brain] Error fetching chats:', err);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

/** Create a new chat */
brainRouter.post('/chats', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { title } = req.body;
    const { data, error } = await supabaseAdmin
      .from('brain_chats')
      .insert({ user_id: user.id, title: title || 'New Chat' })
      .select('*')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('[brain] Error creating chat:', err);
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

/** Delete a chat */
brainRouter.delete('/chats/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from('brain_chats')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    res.status(204).end();
  } catch (err: any) {
    console.error('[brain] Error deleting chat:', err);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

// ── Messages ─────────────────────────────────────────────────────

/** List messages for a specific chat */
brainRouter.get('/chats/:chatId/messages', requireAuth, async (req, res) => {
  try {
    const { chatId } = req.params;
    // Verify chat ownership first
    const user = (req as any).user;
    const { data: chat, error: chatError } = await supabaseAdmin
      .from('brain_chats')
      .select('id')
      .eq('id', chatId)
      .eq('user_id', user.id)
      .single();

    if (chatError || !chat) {
      return res.status(403).json({ error: 'Unauthorised or chat not found' });
    }

    const { data, error } = await supabaseAdmin
      .from('brain_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('[brain] Error fetching messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/** Add a message to a chat */
brainRouter.post('/chats/:chatId/messages', requireAuth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { role, content } = req.body;
    const user = (req as any).user;

    // Verify chat ownership
    const { data: chat, error: chatError } = await supabaseAdmin
      .from('brain_chats')
      .select('id')
      .eq('id', chatId)
      .eq('user_id', user.id)
      .single();

    if (chatError || !chat) {
      return res.status(403).json({ error: 'Unauthorised' });
    }

    const { data, error } = await supabaseAdmin
      .from('brain_messages')
      .insert({ chat_id: chatId, role, content })
      .select('*')
      .single();

    if (error) throw error;

    // Update chat's updated_at
    await supabaseAdmin
      .from('brain_chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', chatId);

    res.json(data);
  } catch (err: any) {
    console.error('[brain] Error adding message:', err);
    res.status(500).json({ error: 'Failed to add message' });
  }
});
