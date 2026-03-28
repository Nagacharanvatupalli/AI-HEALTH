const fetch = require('node-fetch');

/**
 * Translates the values of a medical analysis JSON object while preserving its keys.
 * @param {Object} englishData - The English JSON response from AI.
 * @param {string} targetLang - The target language code (e.g., 'te').
 * @returns {Promise<Object>} - The translated JSON object.
 */
async function translateMedicalAnalysis(englishData, targetLang) {
    if (!targetLang || targetLang === 'en') return englishData;

    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `
    Translate the values of the following medical JSON object from English to Telugu.
    
    CRITICAL RULES:
    1. DO NOT translate the keys. Keys MUST remain exactly in English as provided:
       (e.g., "typesOfPain", "possibleDiseases", "causesOfProblem", "riskLevel", etc.)
    2. ONLY translate the text values.
    3. Maintain the same JSON structure perfectly.
    4. Return ONLY the raw JSON string. No markdown, no "json" label.
    5. Translate medical concepts accurately into Telugu but keep them easy to understand.
    6. Ensure the 'riskLevel' value is translated (e.g., Low -> తక్కువ).

    English JSON to translate:
    ${JSON.stringify(englishData, null, 2)}
    `;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('Translation API Error:', err);
            return englishData; // Fallback to English
        }

        const data = await response.json();
        let resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

        // Clean markdown code blocks if present
        resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            return JSON.parse(resultText);
        } catch (e) {
            console.error('Failed to parse translated JSON:', e);
            return englishData;
        }
    } catch (error) {
        console.error('Translation error:', error);
        return englishData;
    }
}

module.exports = { translateMedicalAnalysis };
