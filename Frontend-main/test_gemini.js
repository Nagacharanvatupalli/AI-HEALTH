const fetch = require('node-fetch');
const dotenv = require('dotenv');
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

async function testModel(model) {
    console.log(`Testing model: ${model}...`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: 'Hello, this is a connection test. Please respond with "Connected".' }]
                }]
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`Error with ${model}: ${response.status} - ${errText}`);
            return false;
        }

        const data = await response.json();
        console.log(`Success with ${model}:`, data.candidates[0].content.parts[0].text);
        return true;
    } catch (error) {
        console.error(`Network error with ${model}:`, error.message);
        return false;
    }
}

async function runTests() {
    await testModel('gemini-1.5-flash');
    await testModel('gemini-2.0-flash');
}

runTests();
