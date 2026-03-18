import { Router } from 'express';
import { supabase } from './supabase.ts';

export const projectsRouter = Router();

projectsRouter.get("/", async (req, res) => {
    try {
        const { data, error } = await supabase.from("projects").select("*");
        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        console.error("Projects fetch error:", err);
        res.status(500).json({ error: err.message });
    }
});

projectsRouter.get("/:id", async (req, res) => {
    try {
        const { data, error } = await supabase.from("projects").select("*").eq("id", req.params.id);
        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        console.error("Projects fetch error:", err);
        res.status(500).json({ error: err.message });
    }
});

projectsRouter.post("/", async (req, res) => {
    try {
        const { data, error } = await supabase.from("projects").insert(req.body);
        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        console.error("Projects fetch error:", err);
        res.status(500).json({ error: err.message });
    }
});

projectsRouter.put("/:id", async (req, res) => {
    try {
        const { data, error } = await supabase.from("projects").update(req.body).eq("id", req.params.id);
        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        console.error("Projects fetch error:", err);
        res.status(500).json({ error: err.message });
    }
});

projectsRouter.delete("/:id", async (req, res) => {
    try {
        const { data, error } = await supabase.from("projects").delete().eq("id", req.params.id);
        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        console.error("Projects fetch error:", err);
        res.status(500).json({ error: err.message });
    }
});
