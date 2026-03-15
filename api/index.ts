import app from '../server';

export default async function handler(req: any, res: any) {
    try {
        return app(req, res);
    } catch (err) {
        console.error('HANDLER CRASH:', err); // ← check Vercel function logs
        res.status(500).json({ error: String(err) });
    }
}
