const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Read the data.json file
const dataFilePath = path.join(__dirname, 'data.json');
const CACHE_DIR = path.join(__dirname, 'tmp');
const CACHE_EXPIRY = 43000; // 12 hours in seconds

// Ensure the cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Utility to hash the User-Agent for caching
function getUserAgentHash(userAgent) {
  return crypto.createHash('md5').update(userAgent).digest('hex');
}

// Fetch the cookie for Zee5 (caching included)
async function fetchCookie(userAgent) {
  const cacheFile = path.join(
    CACHE_DIR,
    `cookie_z5_${getUserAgentHash(userAgent)}.tmp`
  );

  if (
    fs.existsSync(cacheFile) &&
    Date.now() - fs.statSync(cacheFile).mtimeMs < CACHE_EXPIRY * 1000
  ) {
    return fs.readFileSync(cacheFile, 'utf-8');
  }

  const cookie = await generateCookieZee5(userAgent);
  fs.writeFileSync(cacheFile, cookie);
  return cookie;
}

// Generate the Zee5 Cookie
async function generateCookieZee5(userAgent) {
  const m3u8Url = await fetchM3U8url();

  const response = await axios.get(m3u8Url, {
    headers: {
      'User-Agent': userAgent,
    },
    maxRedirects: 5,
  });

  const cookieMatch = response.headers['set-cookie']?.find((cookie) =>
    cookie.includes('hdntl')
  );

  if (!cookieMatch) {
    throw new Error('Could not fetch hdntl token');
  }

  return cookieMatch;
}

// Function to fetch the M3U8 URL
async function fetchM3U8url() {
  return 'https://some.m3u8.url';
}

// Read data from data.json
function getChannelDataById(id) {
  const jsonData = fs.readFileSync(dataFilePath);
  const data = JSON.parse(jsonData);
  return data.data.find((channel) => channel.id == id);
}

// Express setup
const express = require('express');
const app = express();
const port = 3000;

app.get('/playlist', (req, res) => {
  const jsonData = fs.readFileSync(dataFilePath);
  const data = JSON.parse(jsonData);

  const protocol = req.protocol;
  const host = req.get('host');
  const scriptUrl = `${protocol}://${host}/index.js`; // Assuming index.js serves as entry point

  res.header('Content-Type', 'text/plain');
  res.write('#EXTM3U\n\n');

  data.data.forEach((channel) => {
    const { id, channel_name: name, logo, genre } = channel;
    const streamUrl = `${scriptUrl}?id=${id}`;

    res.write(
      `#EXTINF:-1 tvg-id="${id}" group-title="${genre}" tvg-logo="${logo}",${name}\n`
    );
    res.write(`${streamUrl}\n\n`);
  });

  res.end();
});

// Handling individual channel redirection
app.get('/', async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send('Channel id not found in parameter.');
  }

  const channelData = getChannelDataById(id);
  if (!channelData) {
    return res.status(404).send('Channel not found.');
  }

  const userAgent = req.get('User-Agent') || 'Mozilla/5.0';
  try {
    const cookie = await fetchCookie(userAgent);
    const initialUrl = channelData.url;
    res.redirect(`${initialUrl}?${cookie}`);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
