import app from './_server/index.js';

export default async function handler(req: any, res: any) {
    try {
        return app(req, res);
    } catch (err) {
        console.error('HANDLER CRASH:', err);
        res.status(500).json({ error: String(err) });
    }
}