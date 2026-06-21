import { supabase } from '../src/lib/supabase.js';
import { dataService } from '../src/services/dataService.js';

async function test() {
  try {
    console.log("Fetching current queue...");
    const queue = await dataService.getTurnQueue();
    console.log("Current queue:", queue.map(q => ({ name: q.staff?.name, pos: q.position, status: q.status })));
    
    // Find a staff member
    if (queue.length > 0) {
      const first = queue[0];
      console.log(`Setting ${first.staff?.name} to BUSY...`);
      const res = await dataService.updateQueueStatus(first.staff_id, 'BUSY');
      console.log("Result success!");
      
      const newQueue = await dataService.getTurnQueue();
      console.log("New queue:", newQueue.map(q => ({ name: q.staff?.name, pos: q.position, status: q.status })));
    }
  } catch (e) {
    console.error("ERROR:", e);
  }
}

test();
