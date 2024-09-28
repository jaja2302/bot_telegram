const axios = require('axios');
const fs = require('fs');
const cron = require('node-cron');
const idgroup = '120363205553012899@g.us';
const idgroup_testing = '120363204285862734@g.us';
const idgroup_da = '120363303562042176@g.us';
let logFile = 'log_uptime_downtime_pc_ho.txt';
const { basename } = require('path');
const { readFileSync } = require('fs');
// Format date for logging
function formatDate(date) {
  return date.toISOString().replace(/T/, ' ').replace(/\..+/, '');
}

async function pingGoogle() {
  const now = new Date();
  try {
    const response = await axios.get('https://www.google.com');
    if (response.status === 200) {
      fs.appendFileSync(logFile, `${formatDate(now)} - SUCCESS\n`);
    } else {
      fs.appendFileSync(logFile, `${formatDate(now)} - FAILURE\n`);
    }
  } catch (error) {
    fs.appendFileSync(logFile, `${formatDate(now)} - FAILURE\n`);
  }
}


module.exports = {
  pingGoogle,
//   sendSummary,
};
