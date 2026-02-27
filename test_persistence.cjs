const { createInsight, getLatestInsight } = require('./src/db');

async function test() {
    console.log('Testing DB persistence...');

    createInsight('Test insight at ' + new Date().toISOString());
    console.log('Created insight.');

    const latest = getLatestInsight();
    console.log('Retrieved latest:', latest);
}

test().catch(console.error);
