import fetch from 'node-fetch';

// Replace with your bot token
const BOT_TOKEN = '6838753278:AAFmV3guZ5UKJS-rPx5j-DJh42_nfQJVH3k';

const getUpdates = async () => {
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`);
    const data = await response.json();
    if (data.ok) {
      console.log(JSON.stringify(data.result, null, 2));
    } else {
      console.error('Error getting updates:', data.description);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

getUpdates();
