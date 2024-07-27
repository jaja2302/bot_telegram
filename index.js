import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';
import TelegramBot from 'node-telegram-bot-api';
import { exec } from 'child_process';

// Configuration
const BOT_TOKEN = '6838753278:AAFmV3guZ5UKJS-rPx5j-DJh42_nfQJVH3k';
const CHAT_ID = '-4028539622';
const LOG_FILE = 'C:\\Users\\jaja.valentino\\Desktop\\Whatsapp_auth\\bot-grading-error.log';
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
    if (curr.size > prev.size) {
      console.log('Detected change in error.log. Sending to group...');
      sendErrorLogToGroup();
    }
  });
  console.log(`Watching for changes in ${LOG_FILE}`);
}

function handleRestartCommand(msg) {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Restarting the bot...");
 
  restartProcess('bot_grading', chatId);
  restartProcess('bot_da', chatId);
}

function restartProcess(processName, chatId) {
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
