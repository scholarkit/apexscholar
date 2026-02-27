const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(process.cwd(), 'research.db');
const db = new Database(dbPath);

try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables:', tables);

    const insightsTable = tables.find(t => t.name === 'insights');
    if (insightsTable) {
        const count = db.prepare("SELECT COUNT(*) as count FROM insights").get();
        console.log('Insight count:', count);

        if (count.count > 0) {
            const latest = db.prepare("SELECT * FROM insights ORDER BY created_at DESC LIMIT 1").get();
            console.log('Latest insight:', {
                id: latest.id,
                created_at: latest.created_at,
                content_preview: latest.content.substring(0, 50) + '...'
            });
        }
    } else {
        console.log('Insights table does NOT exist!');
    }
} catch (e) {
    console.error('Error checking DB:', e);
} finally {
    db.close();
}
