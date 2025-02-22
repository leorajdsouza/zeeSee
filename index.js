const express = require('express');
const { fetchCookie } = require('./functions');
const app = express();

// Endpoint to get the stream
app.get('/stream', async (req, res) => {
    const userAgent = req.headers['user-agent'] || 'Mozilla/5.0';  // Default user agent if not provided
    const channelId = req.query.id;

    if (!channelId) {
        return res.status(400).send('Channel ID is required');
    }

    try {
        // Fetch the cached or new cookie for the user agent
        const cookie = await fetchCookie(userAgent);
        
        // Redirect the user to the stream with the fetched cookie
        res.redirect(`https://streaming.url?channelId=${channelId}&cookie=${encodeURIComponent(cookie)}`);
    } catch (err) {
        console.error(err);
        return res.status(500).send('Error occurred while processing the stream request');
    }
});

// Start the server
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
