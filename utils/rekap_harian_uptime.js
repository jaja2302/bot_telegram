import { appendFileSync } from 'fs';
import axios from 'axios';

// let logFile = '';
let logFile = 'C:\\Users\\Digital Architect SR\\Desktop\\bot_grading\\log_uptime_downtime_pc_ho.txt';
// Format date for logging
function formatDate(date) {
  return date.toISOString().replace(/T/, ' ').replace(/\..+/, '');
}

async function pingGoogle() {
  const now = new Date();
  try {
    const response = await axios.get('https://www.google.com');
    if (response.status === 200) {
      appendFileSync(logFile, `${formatDate(now)} - SUCCESS\n`);
    } else {
      appendFileSync(logFile, `${formatDate(now)} - FAILURE\n`);
    }
  } catch (error) {
    appendFileSync(logFile, `${formatDate(now)} - FAILURE\n`);
  }
}

export { pingGoogle };
