const dotenv = require('dotenv');
// Point to the .env in the backend folder
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const fetch = require('node-fetch');

async function testGemini() {
    console.log("Starting Gemini API test with node-fetch...");
    const key = process.env.GEMINI_API_KEY;
    const model = 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    console.log(`URL: ${url.replace(key, 'REDACTED')}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello" }] }]
            })
        });

        console.log('Status:', response.status);
        if (response.ok) {
            const data = await response.json();
            console.log('SUCCESS! Response from Gemini received.');
            // console.log(JSON.stringify(data, null, 2));
            process.exit(0);
        } else {
            const text = await response.text();
            console.log('FAILED:', text);
            process.exit(1);
        }
    } catch (error) {
        console.error('FETCH ERROR:', error.message);
        process.exit(1);
    }
}

testGemini();
