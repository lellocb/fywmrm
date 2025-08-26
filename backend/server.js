const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000; // Coolify manages this port

// Your secret token is read safely from environment variables
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Endpoint to start a prediction
app.post('/api/predictions', async (req, res) => {
    if (!REPLICATE_API_TOKEN) {
        return res.status(500).json({ detail: "Server is not configured with a Replicate API token." });
    }
    try {
        const response = await fetch('https://api.replicate.com/v1/predictions', {
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

// Endpoint to check the status of a prediction
app.get('/api/predictions/:id', async (req, res) => {
    try {
        const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${req.params.id}`, {
            headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` }
        });
        const prediction = await pollResponse.json();
        res.json(prediction);
    } catch (error) {
        res.status(500).json({ detail: "Failed to poll prediction status." });
    }
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));