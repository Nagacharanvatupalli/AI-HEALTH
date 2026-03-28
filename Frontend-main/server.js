const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const fetch = require('node-fetch');
const { translateMedicalAnalysis } = require('./translation');


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Serve 3D models from the specific Windows path requested
// We mount this desktop directory as /models so the browser can easily load them.
const modelsPath = 'C:\\Users\\LENOVO\\OneDrive\\Desktop\\Ai-health\\systems';
app.use('/models', express.static(modelsPath));

// Default route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const fs = require('fs');
app.post('/api/debug', (req, res) => {
    fs.writeFileSync('debug-log.json', JSON.stringify(req.body, null, 2));
    res.sendStatus(200);
});

// Doctor Verification In-Memory DB
let pendingRequests = [];
let requestCounter = 1;

app.post('/api/create-case', (req, res) => {
    const caseData = req.body;
    caseData.id = requestCounter++;
    caseData.status = 'pending';
    pendingRequests.push(caseData);
    res.json({ success: true, data: { id: caseData.id } });
});

app.get('/api/patient-status/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const request = pendingRequests.find(r => r.id === id);
    if (request) {
        res.json({ status: request.status, modifiedAnalysis: request.modifiedAnalysis });
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

app.get('/api/doctor-requests', (req, res) => {
    res.json(pendingRequests);
});

app.post('/api/doctor-approve', (req, res) => {
    const { id, modifiedAnalysis, status } = req.body;
    const reqIndex = pendingRequests.findIndex(r => r.id === parseInt(id));
    if (reqIndex !== -1) {
        pendingRequests[reqIndex].status = status;
        if (modifiedAnalysis) {
            pendingRequests[reqIndex].modifiedAnalysis = modifiedAnalysis;
        }
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Request not found' });
    }
});

app.get('/api/patient-status/:caseId', (req, res) => {
    const r = pendingRequests.find(r => r.id === parseInt(req.params.caseId));
    if (r) res.json(r);
    else res.status(404).json({ error: 'not found' });
});


// Gemini AI Endpoint: Patient Analysis
app.post('/api/analyze-patient', async (req, res) => {
    try {
        const {
            meshName,
            anatomicalRegion,
            painLevel,
            duration,
            notes,
            patientName,
            patientAge,
            painLocation,
            additionalSymptoms,
            language
        } = req.body;

        const prompt = `Medical assessment for localized pain.
Patient Details:
- Name: ${patientName || 'Anonymous'}
- Age: ${patientAge || 'N/A'}

Pain Details:
- Location: ${painLocation || anatomicalRegion || meshName}
- Severity/Intensity: ${painLevel}
- Duration: ${duration}
- Symptoms and Notes: ${notes}
- Additional Symptoms info: ${additionalSymptoms}

Please provide a structured response, strictly as valid JSON with the following exactly named keys:
{
  "typesOfPain": "List pain types",
  "possibleDiseases": "List possible diseases",
  "causesOfProblem": "List causes of the problem",
  "riskLevel": "Low / Moderate / High",
  "homeRemedies": "List home remedies",
  "foodGuidance": "List food deficiency guidance",
  "medicineGuidance": "List medicines guidance",
  "doctorConsultation": "Explanation about when to consult",
  "preventionTips": "List prevention tips",
  "emergencyWarningSigns": "List emergency warning signs",
  "accuracy": "A numeric value from 0 to 100 representing the accuracy percentage",
  "confidence": "A numeric value from 0 to 100 representing the confidence percentage"
}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: 'You are an advanced AI medical assistant providing localized pain assessment.' }]
                },
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

        const cleanJSON = (text) => {
            const match = text.match(/\{[\s\S]*\}/);
            return match ? match[0] : text;
        };

        let englishAnalysis;
        try {
            englishAnalysis = JSON.parse(cleanJSON(resultText));
        } catch (e) {
            console.error('Failed to parse AI JSON:', resultText);
            throw new Error('AI returned invalid JSON format');
        }

        // Save original English version to DB
        const requestId = requestCounter++;
        const caseEntry = {
            id: requestId,
            patient: {
                name: patientName || 'Anonymous',
                age: patientAge || 'N/A'
            },
            bodyPart: painLocation || anatomicalRegion || meshName,
            analysisRaw: englishAnalysis,
            status: 'pending'
        };
        pendingRequests.push(caseEntry);

        // Translate if necessary for the response to the user
        let localizedAnalysis = englishAnalysis;
        if (language && language !== 'en') {
            localizedAnalysis = await translateMedicalAnalysis(englishAnalysis, language);
        }

        // Return both English and localized versions as the frontend expects
        res.json({
            result: {
                localized: localizedAnalysis,
                english: englishAnalysis
            },
            requestId: requestId
        });
    } catch (error) {
        console.error('Error in analyze-patient:', error);
        res.status(500).json({ error: 'Failed to analyze patient data.' });
    }
});

// Perplexity AI Endpoint: Doctor Analysis
app.post('/api/analyze-doctor', async (req, res) => {
    try {
        const { theme, partName, description } = req.body;

        const prompt = `Medical explanation for anatomy structure.
System: ${theme}
Structure: ${partName}
Doctor Question/Description: ${description}

Please provide a structured response, preferably as valid JSON with the following keys:
{
  "anatomyDescription": "Detailed anatomy description",
  "function": "Function of the structure",
  "commonDisorders": ["disorder 1", "disorder 2"],
  "symptoms": ["symptom 1", "symptom 2"],
  "clinicalRelevance": "Clinical relevance explanation",
  "diagnosticMethods": ["method 1", "method 2"]
}`;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: 'You are an advanced AI medical assistant providing anatomical analysis to doctors.' }]
                },
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Gemini API Error in analyze-doctor:', errText);
            throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        console.log('Gemini Analysis Doctor Data:', JSON.stringify(data, null, 2));
        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        res.json({ result: resultText });
    } catch (error) {
        console.error('Error in analyze-doctor endpoint:', error);
        res.status(500).json({ error: 'Failed to analyze doctor data.', details: error.message });
    }
});

// Perplexity AI Endpoint: Health Suggestions
app.post('/api/health-suggestions', async (req, res) => {
    try {
        const { age, gender, bp, sugar, hr } = req.body;

        const prompt = `Analyze the patient's condition based on the following vitals:
- Age: ${age}, Gender: ${gender}
- Blood Pressure (BP): ${bp || 'Unknown'}
- Sugar Level: ${sugar || 'Unknown'}
- Heart Rate (HR): ${hr || 'Unknown'}

STRICT INSTRUCTION: You MUST return exactly 5 health suggestions/insights based specifically on these inputs (BP, Sugar, Heart Rate). Do not return more or fewer than 5 insights.
Provide the output strictly as a valid JSON array of exactly 5 strings:
["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"]`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: 'You are a concise, helpful virtual health assistant.' }]
                },
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Gemini API Error Response:', errText);
            throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        res.json({ result: resultText });
    } catch (error) {
        console.error('Error in health-suggestions:', error);
        res.status(500).json({ error: 'Failed to fetch suggestions.', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
