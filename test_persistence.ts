import { createInsight, getLatestInsight } from './src/db';

async function test() {
  console.log('Testing DB persistence with TSX...');
  
  const testContent = 'Test insight at ' + new Date().toISOString();
  createInsight(testContent);
  console.log('Created insight.');
  
  const latest = getLatestInsight();
  console.log('Retrieved latest:', latest);
  
  if (latest && latest.content === testContent) {
    console.log('SUCCESS: Persistence logic in db.ts is working.');
  } else {
    console.error('FAILURE: Persistence logic in db.ts is broken or data mismatch.');
  }
}

test().catch(console.error);
