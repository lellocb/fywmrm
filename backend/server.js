const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// --- RATE LIMITING SETUP ---
// Get the daily limit from environment variables, or default to 50.
const DAILY_LIMIT = parseInt(process.env.DAILY_LIMIT, 10) || 50;
let usage = {
    count: 0,
    // Store the date in YYYY-MM-DD format
    date: new Date().toISOString().split('T')[0] 
};
console.log(`Daily API limit set to ${DAILY_LIMIT} requests.`);
// -------------------------

const REPLICATE_API_ENDPOINT = "https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-dev-lora/predictions";
const REPLICATE_POLL_ENDPOINT = "https://api.replicate.com/v1/predictions";

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/api/predictions', async (req, res) => {
    // --- RATE LIMITING LOGIC ---
    const today = new Date().toISOString().split('T')[0];
    // If the date has changed, reset the counter for the new day.
    if (usage.date !== today) {
        usage.date = today;
        usage.count = 0;
        console.log("New day started. Resetting API usage count.");
    }

    if (usage.count >= DAILY_LIMIT) {
        console.warn(`Daily limit of ${DAILY_LIMIT} reached. Blocking request.`);
        // Return a "429 Too Many Requests" error.
        return res.status(429).json({ detail: "Daily limit reached. Please try again tomorrow." });
    }
    // -------------------------

    if (!REPLICATE_API_TOKEN) {
        return res.status(500).json({ detail: "Server is not configured with a Replicate API token." });
    }

    try {
        // If the limit is not reached, increment the counter and proceed.
        usage.count++;
        console.log(`API usage: ${usage.count}/${DAILY_LIMIT}`);

        const response = await fetch(REPLICATE_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body),
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ detail: "An internal server error occurred." });
    }
});

app.get('/api/predictions/:id', async (req, res) => {
    try {
        const pollResponse = await fetch(`${REPLICATE_POLL_ENDPOINT}/${req.params.id}`, {
            headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` }
        });
        const prediction = await pollResponse.json();
        res.json(prediction);
    } catch (error) {
        res.status(500).json({ detail: "Failed to poll prediction status." });
    }
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
