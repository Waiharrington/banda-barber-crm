const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  try {
    console.log("Fetching current queue from database...");
    const { data: queue, error: getErr } = await supabase
      .from('turn_queue')
      .select('*, staff(*)')
      .order('position');
    if (getErr) throw getErr;

    console.log("Queue size:", queue.length);
    console.log("Queue:", queue.map(q => ({ name: q.staff?.name, pos: q.position, status: q.status })));

    if (queue.length > 0) {
      const first = queue[0];
      console.log(`Simulating updateQueueStatus to BUSY for ${first.staff?.name}...`);
      
      const targetIndex = 0;
      const targetItem = queue[targetIndex];
      const maxPos = queue.length;
      const status = 'BUSY';

      const updates = [];
      let currentPos = 1;
      for (let i = 0; i < queue.length; i++) {
        if (i === targetIndex) continue;
        updates.push({ id: queue[i].id, staff_id: queue[i].staff_id, position: currentPos, status: queue[i].status });
        currentPos++;
      }
      updates.push({ id: targetItem.id, staff_id: targetItem.staff_id, position: maxPos, status: status });

      console.log("Planned updates:", updates.map(u => ({ id: u.id, pos: u.position, status: u.status })));

      console.log("Step 1: Updating to negative positions...");
      for (let i = 0; i < updates.length; i++) {
        const { error } = await supabase.from('turn_queue').update({ position: -updates[i].position }).eq('id', updates[i].id);
        if (error) {
          console.error(`Error updating id ${updates[i].id} to position ${-updates[i].position}:`, error);
          throw error;
        }
      }

      console.log("Step 2: Updating to positive positions...");
      for (let i = 0; i < updates.length; i++) {
        const { error } = await supabase.from('turn_queue').update({ position: updates[i].position, status: updates[i].status }).eq('id', updates[i].id);
        if (error) {
          console.error(`Error updating id ${updates[i].id} to position ${updates[i].position}:`, error);
          throw error;
        }
      }

      console.log("SUCCESS!");
      const { data: newQueue } = await supabase
        .from('turn_queue')
        .select('*, staff(*)')
        .order('position');
      console.log("New Queue:", newQueue.map(q => ({ name: q.staff?.name, pos: q.position, status: q.status })));
    }
  } catch (e) {
    console.error("FAILED WITH ERROR:", e);
  }
}

test();
