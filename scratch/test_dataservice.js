import { dataService } from '../src/services/dataService.js';

async function test() {
  console.log("Checking if dataService works...");
  try {
    const inventory = await dataService.getInventory();
    console.log("Inventory item count:", inventory.length);
    if (inventory.length > 0) {
      const item = inventory[0];
      console.log("Testing updateStock for item:", item.name);
      const updated = await dataService.updateStock(item.id, item.stock);
      console.log("updateStock succeeded! New stock:", updated.stock);
    }
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
