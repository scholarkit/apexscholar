import { Router } from 'express';
import { requireAuth } from './middleware';
import { supabaseAdmin } from './supabase';

export const kvRouter = Router();

kvRouter.get("/:key", requireAuth, async (req, res) => {
  try {
    const { key } = req.params;
    const user = (req as any).user;
    const { data, error } = await supabaseAdmin
      .from('kv_store')
      .select('*')
      .eq('key', key)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(200).json({ value: null });

    res.json({ value: data.value });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

kvRouter.post("/", requireAuth, async (req, res) => {
  try {
    const { key, value } = req.body;
    const user = (req as any).user;
    if (!key) return res.status(400).json({ error: "Missing key" });

    const { data, error } = await supabaseAdmin
      .from('kv_store')
      .upsert(
        { key, value, user_id: user.id, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,key' }
      )
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

kvRouter.delete("/:key", requireAuth, async (req, res) => {
  try {
    const { key } = req.params;
    const user = (req as any).user;
    const { error } = await supabaseAdmin
      .from('kv_store')
      .delete()
      .eq('key', key)
      .eq('user_id', user.id);

    if (error) throw error;
    res.json({ success: true, message: "Key deleted" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});