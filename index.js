import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';
import TelegramBot from 'node-telegram-bot-api';
import { exec } from 'child_process';

// Configuration
const BOT_TOKEN = '6838753278:AAHSODkaOl3BxEE2bMEb8i4rhnejbYK7_9s';
const CHAT_ID = '-4028539622';
const LOG_FILE = 'C:\\Users\\Digital Architect SR\\Desktop\\bot_grading\\bot_grading_error.log';
const bot = new TelegramBot(BOT_TOKEN, { polling: true });


async function sendErrorLogToGroup() {
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
  fs.readFile(LOG_FILE, 'utf-8', (err, data) => {
    if (err) {
      console.error('Error reading log file:', err);
      return;
    }

    const uploadFailed = /Upload failed after 5 attempts/;
    const closingSession = /Closing stale open session for new outgoing prekey bundle/;

    if (closingSession.test(data)) {
      console.log('Found "Closing stale open session for new outgoing prekey bundle" in log. Sending log and restarting application...');
      sendErrorLogToGroup();
      restartProcess('bot_grading');
      restartProcess('bot_da');
    } else if (!uploadFailed.test(data)) {
      console.log('Log file does not contain "Upload failed after 5 attempts". Sending log...');
      sendErrorLogToGroup();
    } else {
      console.log('Log file contains "Upload failed after 5 attempts". Ignoring...');
    }
  });
}

function handleRestartCommand(msg) {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Restarting the bot...");
  
  restartProcess('bot_grading', chatId);
  restartProcess('bot_da', chatId);
}

function restartProcess(processName, chatId = CHAT_ID) {
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
  if (text === '!restartbot') {
    handleRestartCommand(msg);
  }
});

watchLogFile();
// oke /