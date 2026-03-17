import { Router } from 'express';
import { supabaseAdmin } from './supabase';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

export const aiRouter = Router();

aiRouter.post("/chat", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing authorization header" });

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      return res.status(500).json({ error: "OPENROUTER_API_KEY missing in .env" });
    }

    const { messages, options } = req.body;
    const model = options?.model || "google/gemini-2.5-flash"; // default fallback

    const formattedMessages = messages.map((m: string) => ({
      role: "user",
      content: m,
    }));

    const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openrouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Apex Scholar",
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        response_format: {
          type: options?.type || "text",
        },
        stream: options?.stream || false,
      }),
    });

    if (!openRouterRes.ok) {
      const errText = await openRouterRes.text();
      console.error("OpenRouter Error:", errText);
      return res.status(openRouterRes.status).json({ error: "OpenRouter API request failed" });
    }

    if (options?.stream) {
      res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      openRouterRes.body?.pipeTo(new WritableStream({
        write(chunk) {
          res.write(chunk);
        },
        close() {
          res.end();
        }
      }));
    } else {
      const data = await openRouterRes.json();
      // Return in a unified format
      const content = data.choices[0]?.message?.content || "";
      res.json({ message: { content } });
    }

  } catch (err: any) {
    console.error("AI Chat Error:", err);
    res.status(500).json({ error: err.message });
  }
});