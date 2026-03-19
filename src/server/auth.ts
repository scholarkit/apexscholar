import { Router } from 'express';
import { supabase, supabaseAdmin } from './supabase.ts';

export const authRouter = Router();

authRouter.post("/signup", async (req, res) => {
  try {
    const { email, password, display_name, options } = req.body;

    // Auto-confirm email using Admin API and set display_name in metadata
    const { data: adminData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        ...options?.data,
        display_name: display_name
      }
    });
    if (createError) throw createError;

    // Automatically sign them in to generate the JWT session
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

authRouter.post("/refresh", async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ error: "Missing refresh_token" });

    const { data, error } = await supabase.auth.refreshSession({ refresh_token });
    if (error) throw error;
    res.json({ session: data.session });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

authRouter.post("/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { error } = await supabaseAdmin.auth.admin.signOut(token);
      if (error) console.error("Admin signout error:", error);
    }
    res.json({ message: "Logged out successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

authRouter.get("/user", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing authorization header" });

    const token = authHeader.replace('Bearer ', '');
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error) throw error;
    res.json({ user: data.user });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});
