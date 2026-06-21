const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
  const staffId = "e40ce95e-8d99-40ae-b546-75204d0136f8"; // José
  const status = "BUSY";
  
  try {
    const { data: queue, error: getErr } = await supabase
      .from('turn_queue')
      .select('*')
      .order('position');
    if (getErr) throw getErr;

    console.log("Current queue before test:", queue);

    const targetIndex = queue.findIndex(q => q.staff_id === staffId);
    if (targetIndex === -1) {
      console.log("Staff not found in queue");
      return;
    }

    const targetItem = queue[targetIndex];
    const maxPos = queue.length;

    const updates = [];
    let currentPos = 1;
    for (let i = 0; i < queue.length; i++) {
      if (i === targetIndex) continue;
      updates.push({ id: queue[i].id, staff_id: queue[i].staff_id, position: currentPos, status: queue[i].status });
      currentPos++;
    }

    updates.push({ id: targetItem.id, staff_id: targetItem.staff_id, position: maxPos, status: status });
    console.log("Calculated updates:", updates);

    // Apply negative positions first
    for (let i = 0; i < updates.length; i++) {
      console.log(`Setting temp negative position for ID ${updates[i].id} to ${-updates[i].position}`);
      const { error } = await supabase.from('turn_queue').update({ position: -updates[i].position }).eq('id', updates[i].id);
      if (error) {
        console.error(`Error on temp negative update for index ${i}:`, error);
        throw error;
      }
    }

    // Apply final positions
    for (let i = 0; i < updates.length; i++) {
      console.log(`Setting final position for ID ${updates[i].id} to ${updates[i].position} (status: ${updates[i].status})`);
      const { error } = await supabase.from('turn_queue').update({ position: updates[i].position, status: updates[i].status }).eq('id', updates[i].id);
      if (error) {
        console.error(`Error on final update for index ${i}:`, error);
        throw error;
      }
    }

    console.log("Updates successful!");
  } catch (err) {
    console.error("Test failed with error:", err);
  }
}

testUpdate();
