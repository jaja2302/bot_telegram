import { exec } from 'child_process';
import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';

const COOLDOWN_PERIOD = 60000; // 60 seconds
let lastRestartTime = 0;
const CHAT_ID = '-4028539622';
const LOG_FILE = 'C:\\Users\\Digital Architect SR\\Desktop\\bot_grading\\bot_grading_error.log';
const STATE_FILE = 'state.txt'; // File to store allow/not allow state
const MAX_LOG_SIZE = 25 * 1024; // 25 KB

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
  

  export {
    sendErrorLogToGroup,
    watchLogFile,
    checkLogFileContent,
    handleRestartCommand,
    restartProcess,
    setState,
    getState,
  };