import { Router } from 'express';
import { supabaseAdmin } from './supabase.ts';

export const projectsRouter = Router();

projectsRouter.get("/", async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin.from("projects").select("*");
        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        console.error("Projects fetch error:", err);
        res.status(500).json({ error: err.message });
    }
});

projectsRouter.get("/:id", async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin.from("projects").select("*").eq("id", req.params.id);
        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        console.error("Projects fetch error:", err);
        res.status(500).json({ error: err.message });
    }
});

projectsRouter.post("/", async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin.from("projects").insert(req.body).select();
        if (error) throw error;
        res.json(data && data.length > 0 ? data[0] : null);
    } catch (err: any) {
        console.error("Projects create error:", err);
        res.status(500).json({ error: err.message });
    }
});

projectsRouter.put("/:id", async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin.from("projects").update(req.body).eq("id", req.params.id).select();
        if (error) throw error;
        res.json(data && data.length > 0 ? data[0] : null);
    } catch (err: any) {
        console.error("Projects update error:", err);
        res.status(500).json({ error: err.message });
    }
});

projectsRouter.delete("/:id", async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin.from("projects").delete().eq("id", req.params.id);
        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        console.error("Projects delete error:", err);
        res.status(500).json({ error: err.message });
    }
});
