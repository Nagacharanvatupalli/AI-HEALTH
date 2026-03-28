const fetch = require('node-fetch');
const dotenv = require('dotenv');
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
    console.log("Listing available models...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errText = await response.text();
            console.error(`Error listing models: ${response.status} - ${errText}`);
            return;
        }

        const data = await response.json();
        console.log("Models:", JSON.stringify(data.models.map(m => m.name), null, 2));
    } catch (error) {
        console.error("Network error:", error.message);
    }
}

listModels();
