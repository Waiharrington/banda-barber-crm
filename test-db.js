import { dataService } from './src/services/dataService.js';
dataService.getStaff().then(s => console.log(s[0])).catch(console.error);
