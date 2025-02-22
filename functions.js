const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Path to store cache files
const CACHE_DIR = path.join(__dirname, 'tmp');
const CACHE_EXPIRY = 43000; // 12 hours in seconds

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Generate a hash of the user-agent to use as a cache key
function getUserAgentHash(userAgent) {
    return crypto.createHash('md5').update(userAgent).digest('hex');
}

// Fetch the cookie (hdntl token) using M3U8 URL generation logic
async function fetchCookie(userAgent) {
    // Generate cache file path based on user-agent hash
    //const cacheFile = path.join(CACHE_DIR, `cookie_z5_${getUserAgentHash(userAgent)}.tmp`);
    const cacheFile = "/tmp/cookie_z5_$UAhash.tmp";

    // Check if the cache file exists and is valid (not expired)
    if (fs.existsSync(cacheFile) && (Date.now() - fs.statSync(cacheFile).mtimeMs < CACHE_EXPIRY * 1000)) {
        return fs.readFileSync(cacheFile, 'utf-8');
    }

    // If no valid cache, generate a new cookie
    const cookie = await generateCookieZee5(userAgent);
    
    // Save the cookie to the cache file
    fs.writeFileSync(cacheFile, cookie);
    
    return cookie;
}

// Generate Cookie (hdntl token)
async function generateCookieZee5(userAgent) {
    const m3u8Url = await fetchM3U8url();
    
    const response = await axios.get(m3u8Url, {
        headers: {
            'User-Agent': userAgent,
        },
        maxRedirects: 5,  // Allow redirections
    });

    const cookieMatch = response.headers['set-cookie']?.find(cookie => cookie.includes('hdntl'));
    
    if (!cookieMatch) {
        throw new Error('Could not fetch hdntl token');
    }
    
    return cookieMatch;
}

// Fetch M3U8 URL (similar to PHP fetchM3U8url function)
async function fetchM3U8url() {
    // Simulating the M3U8 URL fetching process
    // This will return a dummy M3U8 URL for now, implement your logic for fetching the real URL.
    return 'https://some.m3u8.url'; 
}

module.exports = {
    fetchCookie,
};
