const fetch = require('node-fetch');
const dotenv = require('dotenv');
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

async function testModelSimple(model, version = 'v1beta') {
    console.log(`Testing model: ${model} with API version: ${version}...`);
    const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${API_KEY}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: 'Connected?' }]
                }]
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error(`Error with ${model} (${version}): ${response.status} - ${JSON.stringify(data.error)}`);
            return false;
        }

        console.log(`Success with ${model} (${version}):`, data.candidates[0].content.parts[0].text);
        return true;
    } catch (error) {
        console.error(`Network error with ${model} (${version}):`, error.message);
        return false;
    }
}

async function runTests() {
    await testModelSimple('gemini-2.0-flash', 'v1beta');
    await testModelSimple('gemini-flash-lite-latest', 'v1beta');
}

runTests();
