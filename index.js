import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';
import TelegramBot from 'node-telegram-bot-api';
import { exec } from 'child_process';
import {pingGoogle} from './utils/rekap_harian_uptime.js'
import cron from 'node-cron'
// Configuration
const BOT_TOKEN = '6838753278:AAHSODkaOl3BxEE2bMEb8i4rhnejbYK7_9s';
const CHAT_ID = '-4028539622';
const LOG_FILE = 'C:\\Users\\Digital Architect SR\\Desktop\\bot_grading\\bot_grading_error.log';
const STATE_FILE = 'state.txt'; // File to store allow/not allow state
const MAX_LOG_SIZE = 25 * 1024; // 25 KB
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const COOLDOWN_PERIOD = 60000; // 60 seconds
let lastRestartTime = 0;

// Initialize state file if it doesn't exist
if (!fs.existsSync(STATE_FILE)) {
  fs.writeFileSync(STATE_FILE, '1'); // Default to allow (1)
}

function getState() {
  return fs.readFileSync(STATE_FILE, 'utf-8') === '1';
}

function setState(allowed) {
  fs.writeFileSync(STATE_FILE, allowed ? '1' : '0');
}

async function sendErrorLogToGroup() {
  if (!getState()) {
    console.log('Sending error log is disabled.');
    return;
  }

  if (fs.statSync(LOG_FILE).size > MAX_LOG_SIZE) {
    console.log('Log file too large. Clearing it...');
    clearLogFile();
    return;
  }

  console.log('Preparing to send log file...');
  const formData = new FormData();
  formData.append('chat_id', CHAT_ID);
  formData.append('document', fs.createReadStream(LOG_FILE));

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    if (data.ok) {
      console.log('Log file sent successfully. Clearing the log file...');
      clearLogFile();
    } else {
      console.error('Error sending message:', data.description);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

function clearLogFile() {
  fs.truncate(LOG_FILE, 0, (err) => {
    if (err) console.error('Error clearing the log file:', err);
    else console.log('Log file cleared.');
  });
}

function watchLogFile() {
  fs.watchFile(LOG_FILE, (curr, prev) => {
    console.log(`File changed at ${curr.mtime}`);
    console.log(`Current size: ${curr.size}, Previous size: ${prev.size}`);
    
    if (curr.mtime > prev.mtime) {
      console.log('Detected change in error.log. Checking content...');
      checkLogFileContent();
    }
  });
  console.log(`Watching for changes in ${LOG_FILE}`);
}

function checkLogFileContent() {
  if (!getState()) {
    console.log('Functionality disabled by user.');
    return;
  }

  if (fs.statSync(LOG_FILE).size > MAX_LOG_SIZE) {
    console.log('Log file too large. Clearing it...');
    clearLogFile();
    return;
  }

  fs.readFile(LOG_FILE, 'utf-8', (err, data) => {
    if (err) {
      console.error('Error reading log file:', err);
      return;
    }

    const forbiddenError = /Error fetching files: Error: forbidden/;
    const uploadFailed = /Upload failed after 5 attempts/;
    const closingSession = /Closing stale open session for new outgoing prekey bundle/;
    const noPm2Processes = /pm2 0 process/;

    if (forbiddenError.test(data)) {
      console.log('Detected "Error fetching files: Error: forbidden" error.');
      if (Date.now() - lastRestartTime > COOLDOWN_PERIOD) {
        console.log('Sending log and restarting application due to forbidden error...');
        lastRestartTime = Date.now();
        sendErrorLogToGroup();
        restartProcess('bot_grading');
        // restartProcess('bot_da');
      } else {
        console.log('Restart ignored due to cooldown period.');
      }
      return;
    }

    if (noPm2Processes.test(data)) {
      console.log('Detected "pm2 0 process" error. Restart ignored due to no running processes.');
      return;
    }

    if (closingSession.test(data)) {
      console.log('Found "Closing stale open session for new outgoing prekey bundle" in log.');
      if (Date.now() - lastRestartTime > COOLDOWN_PERIOD) {
        console.log('Sending log and restarting application...');
        lastRestartTime = Date.now();
        sendErrorLogToGroup();
        restartProcess('bot_grading');
        // restartProcess('bot_da');
      } else {
        console.log('Restart ignored due to cooldown period.');
      }
    } else if (!uploadFailed.test(data)) {
      console.log('Log file does not contain "Upload failed after 5 attempts".');
      if (Date.now() - lastRestartTime > COOLDOWN_PERIOD) {
        console.log('Sending log...');
        lastRestartTime = Date.now();
        sendErrorLogToGroup();
      } else {
        console.log('Log sending ignored due to cooldown period.');
      }
    } else {
      console.log('Log file contains "Upload failed after 5 attempts". Ignoring...');
    }
  });
}

function handleRestartCommand(msg) {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Restarting the bot...");
  
  restartProcess('bot_grading', chatId);
  // restartProcess('bot_da', chatId);
}

function restartProcess(processName, chatId = CHAT_ID) {
  if (!getState()) {
    console.log(`Restarting ${processName} is disabled.`);
    return;
  }

  exec(`pm2 restart ${processName}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      bot.sendMessage(chatId, `Error restarting ${processName}: ${error}`);
    } else {
      console.log(`stdout: ${stdout}`);
      bot.sendMessage(chatId, `${processName} restarted successfully.`);
    }
  });
}

bot.on('message', (msg) => {
  const text = msg.text;
  if (text === '!allow') {
    setState(true);
    bot.sendMessage(msg.chat.id, 'Bot is now allowed to send error logs and restart processes.');
  } else if (text === '!notallow') {
    setState(false);
    bot.sendMessage(msg.chat.id, 'Bot is now NOT allowed to send error logs or restart processes.');
  } else if (text === '!restartbot') {
    handleRestartCommand(msg);
  }
});

watchLogFile();
cron.schedule(
  '*/5 * * * *',
  async () => {
    await pingGoogle();
  },
  {
    scheduled: true,
    timezone: 'Asia/Jakarta',
  }
);

// Optionally, check the state every 5 minutes
setInterval(() => {
  const allowed = getState();
  console.log(`Checking state: ${allowed ? 'Allowed' : 'Not Allowed'}`);
}, 300000); // 300000ms = 5 minutes
