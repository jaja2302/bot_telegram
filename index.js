import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import { watchLogFile, handleRestartCommand, setState, getState } from './utils/bot_watch_tele.js';
import { pingGoogle } from './utils/rekap_harian_uptime.js';
import cron from 'node-cron';

dotenv.config();

// const BOT_TOKEN = process.env.BOT_TOKEN;
const BOT_TOKEN = '6838753278:AAHSODkaOl3BxEE2bMEb8i4rhnejbYK7_9s';
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

bot.on('message', async (msg) => {
  try {
    const text = msg.text;
    if (text === '!allow') {
      setState(true);
      await bot.sendMessage(msg.chat.id, 'Bot is now allowed to send error logs and restart processes.');
    } else if (text === '!notallow') {
      setState(false);
      await bot.sendMessage(msg.chat.id, 'Bot is now NOT allowed to send error logs or restart processes.');
    } else if (text === '!restartbot') {
      await handleRestartCommand(msg);
    }
  } catch (error) {
    console.error('Error handling message:', error);
  }
});

watchLogFile();
// oke

cron.schedule('*/5 * * * *', () => {
  // First task: Ping Google
  pingGoogle();

  // Second task: Check state
  const allowed = getState();
  console.log(`Checking state: ${allowed ? 'Allowed' : 'Not Allowed'}`);
}, {
  scheduled: true,
  timezone: 'Asia/Jakarta',
});
