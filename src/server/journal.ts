import { Router } from 'express';
import { supabase } from './supabase';
import { requireAuth } from './middleware';

export const journalRouter = Router();

journalRouter.get("/", requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        const { data, error } = await supabase
            .from("journal_entries")
            .select("*")
            .eq("author_id", user.id);
        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        console.error("Journal get error:", err);
        res.status(500).json({ error: err.message });
    }
});

journalRouter.get("/:id", requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        const projectId = req.params.id;
        const { data, error } = await supabase
            .from("journal_entries")
            .select("*")
            .eq("author_id", user.id)
            .eq("project_id", projectId)
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        console.error("Journal get error:", err);
        res.status(500).json({ error: err.message });
    }
});

journalRouter.post("/", requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        const { data, error } = await supabase
            .from("journal_entries")
            .insert({
                author_id: user.id,
                ...req.body,
            })
            .select("*")
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        console.error("Journal post error:", err);
        res.status(500).json({ error: err.message });
    }
});

journalRouter.put("/:id", requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        const { data, error } = await supabase
            .from("journal_entries")
            .update(req.body)
            .eq("id", req.params.id)
            .eq("author_id", user.id)
            .select("*")
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        console.error("Journal put error:", err);
        res.status(500).json({ error: err.message });
    }
});

journalRouter.delete("/:id", requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        const { data, error } = await supabase
            .from("journal_entries")
            .delete()
            .eq("id", req.params.id)
            .eq("author_id", user.id)
            .select("*")
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        console.error("Journal delete error:", err);
        res.status(500).json({ error: err.message });
    }
});


