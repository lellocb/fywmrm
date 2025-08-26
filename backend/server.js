const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000; // Coolify manages this port

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// The new, model-specific API endpoint
const REPLICATE_API_ENDPOINT = "https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-dev-lora/predictions";
// Generic endpoint for polling status (this stays the same)
const REPLICATE_POLL_ENDPOINT = "https://api.replicate.com/v1/predictions";


app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Endpoint to start a prediction
app.post('/api/predictions', async (req, res) => {
    if (!REPLICATE_API_TOKEN) {
        return res.status(500).json({ detail: "Server is not configured with a Replicate API token." });
    }
    try {
        const response = await fetch(REPLICATE_API_ENDPOINT, { // <-- USES THE NEW ENDPOINT
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body), // <-- Pass the body directly
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ detail: "An internal server error occurred." });
    }
});

// Endpoint to check the status of a prediction
app.get('/api/predictions/:id', async (req, res) => {
    try {
        const pollResponse = await fetch(`${REPLICATE_POLL_ENDPOINT}/${req.params.id}`, { // <-- Polling still uses the generic endpoint
            headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` }
        });
        const prediction = await pollResponse.json();
        res.json(prediction);
    } catch (error) {
        res.status(500).json({ detail: "Failed to poll prediction status." });
    }
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
