const express = require('express');
const router = express.Router();
const PainRecord = require('./painModel');
const mongoose = require('mongoose');
const Doctor = require('./doctorModel');
const jwt = require('jsonwebtoken');
const protectDoctorRoute = require('./authMiddleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage: storage });

// ============================================================
// DB CONNECTION STATE CHECK
// ============================================================
function isDbConnected() {
    return mongoose.connection.readyState === 1;
}

// ============================================================
// PERPLEXITY AI PAIN ANALYSIS
// ============================================================
const PPLX_API_KEY = process.env.PPLX_API_KEY;
const PPLX_MODEL = 'sonar-pro';

router.post('/analyze-pain', async (req, res) => {
    const { bodyPart, anatomicalRegion, painLevel, painType, duration, notes } = req.body;

    const urgencyHint = painLevel >= 8 ? 'high' : painLevel >= 5 ? 'medium' : 'low';
    const painSeverityLabel = painLevel >= 8 ? 'severe' : painLevel >= 5 ? 'moderate' : 'mild';

    const prompt = `You are an experienced clinical medical assistant with deep knowledge in anatomy, pathology, and patient care. A patient presents with the following complaint:

Body Part: ${bodyPart}
Anatomical Region: ${anatomicalRegion}
Pain Level: ${painLevel}/10 (${painSeverityLabel})
Pain Type: ${painType}
Duration: ${duration || 'not specified'}
Additional Notes: ${notes || 'none'}

Based on this specific presentation, provide a thorough clinical analysis. Consider both common and serious differential diagnoses. Be specific to the exact body part, pain type, and severity described.

RESPOND ONLY with a single valid JSON object — no markdown fences, no extra text before or after:
{
  "summary": "2-3 sentence clinical overview specific to ${bodyPart} ${painType} pain at level ${painLevel}/10. Mention the most likely category of cause and what the patient should know.",
  "causes": [
    {
      "title": "Most likely specific diagnosis",
      "description": "3-4 sentences: explain the pathophysiology, why it causes pain specifically in ${bodyPart}, what makes it better or worse, and how it relates to the ${painType} pain type at level ${painLevel}.",
      "severity": "mild"
    },
    {
      "title": "Second most likely diagnosis",
      "description": "3-4 sentences with clinical detail specific to ${bodyPart} and ${painType} pain.",
      "severity": "moderate"
    },
    {
      "title": "Third diagnosis — include a serious red flag condition if pain level is 5 or above",
      "description": "3-4 sentences. If serious, explain clearly why it must not be missed and what to watch for.",
      "severity": "${urgencyHint === 'high' ? 'severe' : 'moderate'}"
    }
  ],
  "precautions": [
    {
      "icon": "🛌",
      "title": "Rest and Activity",
      "detail": "Specific positioning, activity restrictions, and rest advice for ${bodyPart} pain. Include which movements or activities to avoid."
    },
    {
      "icon": "💊",
      "title": "Medications",
      "detail": "Specific OTC medications suitable for ${painType} pain at this severity, with dosing guidance. Note if prescription medication may be needed."
    },
    {
      "icon": "🩺",
      "title": "When to See a Doctor",
      "detail": "List 4-5 specific red flag symptoms related to ${bodyPart} pain that require immediate or urgent medical attention."
    },
    {
      "icon": "🧊",
      "title": "Home Care",
      "detail": "Ice or heat therapy protocol, gentle stretches if appropriate, ergonomic tips, and lifestyle factors that can help relieve ${bodyPart} pain."
    }
  ],
  "urgency": "${urgencyHint}",
  "disclaimer": "This AI analysis is for informational purposes only and does not constitute medical advice. Always consult a qualified healthcare provider for diagnosis and treatment."
}`;

    try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PPLX_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: PPLX_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a clinical medical assistant with expertise in anatomy and differential diagnosis. Always respond with precise, evidence-based medical information in valid JSON format only. Never include text outside the JSON object.'
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1,
                max_tokens: 1800,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Perplexity API error:', errText);
            return res.status(502).json({ success: false, error: 'AI service error', detail: errText });
        }

        const data = await response.json();
        const raw = data.choices?.[0]?.message?.content || '{}';

        // Strip markdown fences if model adds them
        const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

        let analysis;
        try {
            analysis = JSON.parse(cleaned);
        } catch (parseErr) {
            console.error('JSON parse error. Raw excerpt:', cleaned.substring(0, 300));
            analysis = {
                summary: 'Analysis could not be parsed. Please try again.',
                causes: [],
                precautions: [],
                urgency: 'medium',
                disclaimer: 'Consult a licensed physician.'
            };
        }

        res.json({ success: true, data: analysis });
    } catch (err) {
        console.error('analyze-pain error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================================
// PAIN RECORDS — offline-safe CRUD
// ============================================================

// GET all pain records
// GET all VERIFIED pain records (For main patient UI)
router.get('/pain', async (req, res) => {
    if (!isDbConnected()) {
        return res.json({ success: true, data: [], offline: true });
    }
    try {
        const records = await PainRecord.find({ status: { $in: ['VERIFIED', 'MODIFIED_VERIFIED'] } }).sort({ timestamp: -1 });
        res.json({ success: true, data: records });
    } catch (err) {
        res.json({ success: true, data: [], offline: true });
    }
});

// POST new pain record
router.post('/pain', async (req, res) => {
    if (!isDbConnected()) {
        return res.json({ success: true, data: req.body, offline: true });
    }
    try {
        const { meshName, anatomicalRegion, painLevel, painType, duration, notes } = req.body;
        const record = await PainRecord.findOneAndUpdate(
            { meshName },
            { meshName, anatomicalRegion, painLevel, painType, duration, notes, timestamp: Date.now() },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.json({ success: true, data: record });
    } catch (err) {
        res.json({ success: true, data: req.body, offline: true });
    }
});

// DELETE a pain record by id
router.delete('/pain/:id', async (req, res) => {
    if (!isDbConnected()) {
        return res.json({ success: true, message: 'Offline mode', offline: true });
    }
    try {
        await PainRecord.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Pain record deleted' });
    } catch (err) {
        res.json({ success: true, message: 'Offline mode', offline: true });
    }
});

// DELETE pain record by meshName
router.delete('/pain/mesh/:meshName', async (req, res) => {
    if (!isDbConnected()) {
        return res.json({ success: true, message: 'Offline mode', offline: true });
    }
    try {
        await PainRecord.deleteMany({ meshName: req.params.meshName });
        res.json({ success: true, message: 'Pain records for mesh deleted' });
    } catch (err) {
        res.json({ success: true, message: 'Offline mode', offline: true });
    }
});

// ============================================================
// DOCTOR AUTHENTICATION & VERIFICATION SYSTEM
// ============================================================

// POST /api/create-case (Main website posts here)
// Valid painType enum values from schema
const VALID_PAIN_TYPES = ['Acute', 'Chronic', 'Neuropathic', 'Referred', 'Visceral', 'Somatic', 'Other'];

router.post('/create-case', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'xray', maxCount: 1 }]), async (req, res) => {
    if (!isDbConnected()) {
        // Offline fallback: return a fake ID so frontend doesn't crash
        return res.json({ success: false, message: 'Offline mode', offline: true, data: { _id: 'offline-' + Date.now() } });
    }
    try {
        const { meshName, anatomicalRegion, painLevel, painType, duration, notes, aiAnalysis, riskLevel, suggestedStream, patientName, patientAge, patient, language } = req.body;

        // Clamp painLevel to 0–10 and map painType to valid enum value
        const safePainLevel = Math.min(10, Math.max(0, Number(painLevel) || 1));
        const safePainType = VALID_PAIN_TYPES.includes(painType) ? painType : 'Other';

        // Parse aiAnalysis if it came as a string (e.g. from FormData)
        let parsedAiAnalysis = aiAnalysis;
        if (typeof aiAnalysis === 'string') {
            try { parsedAiAnalysis = JSON.parse(aiAnalysis); } catch (e) { /* keep as string */ }
        }

        // Extract patient info from multiple possible formats
        const resolvedPatientName = patientName || patient?.name || 'Anonymous';
        const resolvedPatientAge = String(patientAge || patient?.age || 'N/A');

        // Server-side stream inference fallback
        let effectiveStream = suggestedStream || 'General';
        if (effectiveStream === 'General' || !effectiveStream) {
            const bp = (meshName || anatomicalRegion || '').toLowerCase();
            const analysisStr = typeof aiAnalysis === 'string' ? aiAnalysis.toLowerCase() : JSON.stringify(aiAnalysis || {}).toLowerCase();

            const ORTHO_KEYWORDS = ['knee', 'shoulder', 'bone', 'ankle', 'wrist', 'spine', 'elbow', 'hip', 'thigh', 'back', 'joint', 'మోకాలు', 'భుజం', 'ఎముక', 'వెన్నెముక', 'కీలు'];
            const NEURO_KEYWORDS = ['brain', 'head', 'nerve', 'neurology', 'skull', 'facial', 'మెదడు', 'తల', 'నరం'];
            const CARDIO_KEYWORDS = ['heart', 'chest', 'cardiology', 'vein', 'artery', 'blood', 'గుండె', 'ఛాతీ'];

            if (ORTHO_KEYWORDS.some(k => bp.includes(k) || analysisStr.includes(k))) effectiveStream = 'Orthopedic';
            else if (NEURO_KEYWORDS.some(k => bp.includes(k) || analysisStr.includes(k))) effectiveStream = 'Neurology';
            else if (CARDIO_KEYWORDS.some(k => bp.includes(k) || analysisStr.includes(k))) effectiveStream = 'Cardiology';
        }

        const imageFile = req.files && req.files['image'] ? req.files['image'][0] : null;
        const xrayFile = req.files && req.files['xray'] ? req.files['xray'][0] : null;

        const record = new PainRecord({
            meshName: meshName || 'Unknown',
            anatomicalRegion: anatomicalRegion || 'Unknown',
            painLevel: safePainLevel,
            painType: safePainType,
            duration: duration || '0 days',
            notes: notes || '',
            aiAnalysis: parsedAiAnalysis || {},
            riskLevel: riskLevel || 'Low',
            suggestedStream: effectiveStream,
            patientName: resolvedPatientName,
            patientAge: resolvedPatientAge,
            language: language || 'en',
            imageUrl: imageFile ? imageFile.filename : null,
            xrayUrl: xrayFile ? xrayFile.filename : null,
            status: 'PENDING',
            timestamp: Date.now()
        });

        let saved = false;
        let lastErr;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                await record.save();
                saved = true;
                break;
            } catch (err) {
                lastErr = err;
                console.warn(`create-case save warning (attempt ${attempt}):`, err.message);
                if (attempt < 3) await new Promise(r => setTimeout(r, 1000));
            }
        }
        
        if (!saved) throw lastErr;

        res.json({ success: true, data: record });
    } catch (err) {
        console.error('create-case error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/send-to-doctor (Hackathon app posts here)
router.post('/send-to-doctor', upload.single('image'), async (req, res) => {
    if (!isDbConnected()) return res.json({ success: false, message: 'Offline mode', offline: true });
    try {
        let { patient, bodyPart, analysisRaw, language } = req.body;

        let parsedPatient = patient;
        if (typeof patient === 'string') {
            try { parsedPatient = JSON.parse(patient); } catch (e) {}
        }

        let imageUrl = null;
        if (req.file) {
            imageUrl = req.file.filename;
        }

        // Attempt to parse risk level and suggested stream from analysis raw
        let riskLevel = 'Low';
        let suggestedStream = 'General';
        try {
            // Strip any wrapping markdown code blocks from analysisRaw
            let cleanStr = analysisRaw.trim();
            if (cleanStr.startsWith('```json')) cleanStr = cleanStr.substring(7);
            else if (cleanStr.startsWith('```')) cleanStr = cleanStr.substring(3);
            if (cleanStr.endsWith('```')) cleanStr = cleanStr.substring(0, cleanStr.length - 3);

            const parsed = JSON.parse(cleanStr);
            if (parsed.riskLevel) riskLevel = parsed.riskLevel;

            // Basic guessing for stream based on body part
            const bpLower = (bodyPart || '').toLowerCase();
            if (bpLower.includes('bone') || bpLower.includes('skeleton')) suggestedStream = 'Orthopedic';
            else if (bpLower.includes('brain') || bpLower.includes('nerve')) suggestedStream = 'Neurology';
            else if (bpLower.includes('heart') || bpLower.includes('blood')) suggestedStream = 'Cardiology';

        } catch (e) {
            console.log("Could not extract riskLevel/stream from analysisRaw in send-to-doctor");
        }

        const notes = `Patient: ${parsedPatient?.name}, Age: ${parsedPatient?.age}, Gender: ${parsedPatient?.gender}, BP: ${parsedPatient?.bp}, Sugar: ${parsedPatient?.sugar}, HR: ${parsedPatient?.hr}`;

        const record = new PainRecord({
            meshName: bodyPart || 'Unknown',
            anatomicalRegion: bodyPart || 'Unknown',
            painLevel: 5, // Default placeholder
            painType: 'Patient Analysis Report',
            duration: 0,
            notes: notes,
            aiAnalysis: analysisRaw,
            riskLevel: riskLevel,
            suggestedStream: suggestedStream,
            patientName: parsedPatient?.name || 'Anonymous',
            patientAge: String(parsedPatient?.age || 'N/A'),
            language: language || 'en',
            imageUrl: imageUrl,
            status: 'PENDING',
            timestamp: Date.now()
        });
        await record.save();
        res.json({ success: true, id: record._id });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/doctor-requests (Hackathon doctor terminal polls here)
router.get('/doctor-requests', async (req, res) => {
    if (!isDbConnected()) return res.json([]);
    try {
        const records = await PainRecord.find({ status: 'PENDING' }).sort({ timestamp: -1 });

        // Map to format expected by app.js
        const mapped = records.map(r => {
            // Reconstruct patient object from notes if possible
            let patientName = 'Unknown';
            let patientAge = 'N/A';
            if (r.notes) {
                const nameMatch = r.notes.match(/Patient:\s*([^,]+)/);
                const ageMatch = r.notes.match(/Age:\s*([^,]+)/);
                if (nameMatch) patientName = nameMatch[1].trim();
                if (ageMatch) patientAge = ageMatch[1].trim();
            }

            return {
                id: r._id,
                status: r.status.toLowerCase(),
                bodyPart: r.meshName,
                analysisRaw: r.aiAnalysis,
                imageUrl: r.imageUrl || null,
                xrayUrl: r.xrayUrl || null,
                patient: {
                    name: patientName,
                    age: patientAge
                }
            };
        });
        res.json(mapped);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/doctor-approve (Hackathon doctor terminal posts here)
router.post('/doctor-approve', async (req, res) => {
    if (!isDbConnected()) return res.json({ success: false, message: 'Offline mode' });
    try {
        const { id, modifiedAnalysis, status } = req.body;
        console.log(`[DEBUG] Doctor Approve received for ID: ${id}, Status: ${status}`);

        let targetStatus = 'VERIFIED';
        if (status === 'modified') targetStatus = 'MODIFIED_VERIFIED';
        else if (status === 'rejected') targetStatus = 'REJECTED';

        // First, fetch the original record to know the patient's language preference
        const originalRecord = await PainRecord.findById(id);
        if (!originalRecord) {
            console.error(`[DEBUG] Record not found for ID: ${id}`);
            return res.status(404).json({ success: false, message: 'Record not found' });
        }

        let updateData = { status: targetStatus, verifiedAt: new Date() };

        if (modifiedAnalysis) {
            console.log(`[DEBUG] Modified Analysis provided: ${typeof modifiedAnalysis === 'string' ? modifiedAnalysis.substring(0, 50) + '...' : 'object'}`);
            let englishAnalysis;
            try {
                // If it's a string, try to parse it (app.js sends string from textarea)
                englishAnalysis = typeof modifiedAnalysis === 'string' ? JSON.parse(modifiedAnalysis) : modifiedAnalysis;
            } catch (e) {
                console.error(`[DEBUG] JSON Parse failed for modifiedAnalysis:`, e.message);
                englishAnalysis = modifiedAnalysis;
            }

            // If the patient's language is Telugu (or any non-English), re-translate the
            // doctor's updated English analysis to the patient's language so the patient
            // always sees the verified, up-to-date localized version.
            const patientLang = originalRecord.language || 'en';
            if (patientLang !== 'en') {
                console.log(`[DEBUG] Patient language is '${patientLang}'. Re-translating doctor's English edits...`);
                try {
                    const localizedAnalysis = await translateObject(englishAnalysis, patientLang);
                    // Store both versions: English as master, localized for patient display
                    updateData.aiAnalysis = {
                        english: englishAnalysis,
                        localized: localizedAnalysis
                    };
                    console.log(`[DEBUG] Re-translation to '${patientLang}' successful.`);
                } catch (translateErr) {
                    console.error(`[DEBUG] Translation failed, saving English only:`, translateErr.message);
                    updateData.aiAnalysis = { english: englishAnalysis, localized: englishAnalysis };
                }
            } else {
                updateData.aiAnalysis = englishAnalysis;
            }
        }

        const updated = await PainRecord.findByIdAndUpdate(id, updateData, { new: true });
        if (!updated) {
            console.error(`[DEBUG] Record not found for ID: ${id}`);
            return res.status(404).json({ success: false, message: 'Record not found' });
        }

        console.log(`[DEBUG] Record updated successfully. New status: ${updated.status}`);
        res.json({ success: true });
    } catch (err) {
        console.error(`[DEBUG] Doctor Approve Error:`, err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/patient-status/:caseId (Polling for Doctor Approval)
router.get('/patient-status/:caseId', async (req, res) => {
    if (!isDbConnected()) return res.json({ status: 'pending' });
    try {
        const record = await PainRecord.findById(req.params.caseId);
        if (!record) return res.status(404).json({ error: 'Case not found' });

        if (record.status === 'VERIFIED' || record.status === 'MODIFIED_VERIFIED') {
            // Return the localized (patient's language) version when it exists.
            // aiAnalysis will be { english, localized } when the doctor verified a
            // non-English case; fall back to the raw aiAnalysis for English cases.
            let analysisForPatient = record.aiAnalysis;
            if (analysisForPatient && analysisForPatient.localized) {
                analysisForPatient = analysisForPatient.localized;
            } else if (analysisForPatient && analysisForPatient.english) {
                analysisForPatient = analysisForPatient.english;
            }

            res.json({
                status: record.status === 'VERIFIED' ? 'agreed' : 'modified',
                modifiedAnalysis: analysisForPatient,
                doctorNotes: record.doctorNotes,
                patientLanguage: record.language || 'en',
                aiAccuracy: record.aiAccuracy ?? (record.status === 'VERIFIED' ? 100 : 0),
                doctorCorrection: record.doctorCorrection ?? (record.status === 'VERIFIED' ? 0 : 0)
            });
        } else if (record.status === 'REJECTED') {
            res.json({ status: 'rejected' });
        } else {
            res.json({ status: 'pending' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/doctor-login
router.post('/doctor-login', async (req, res) => {
    try {
        const { doctorId, password } = req.body;
        const doctor = await Doctor.findOne({ doctorId });
        if (!doctor) return res.status(401).json({ message: 'Invalid credentials' });
        if (doctor.password !== password) return res.status(401).json({ message: 'Invalid credentials' });
        if (!doctor.active) return res.status(403).json({ message: 'Account is inactive' });

        const token = jwt.sign(
            { doctorId: doctor.doctorId, stream: doctor.stream },
            process.env.JWT_SECRET || 'super-secret-doctor-key-12345',
            { expiresIn: '8h' }
        );

        res.json({
            doctorId: doctor.doctorId,
            stream: doctor.stream,
            token
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PROTECTED DOCTOR ROUTES
router.get('/dashboard-stats', protectDoctorRoute, async (req, res) => {
    try {
        const stream = req.doctor.stream;
        const streamRegex = new RegExp(`^${stream}$`, 'i');
        const totalPending = await PainRecord.countDocuments({ status: 'PENDING', suggestedStream: streamRegex });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const verifiedToday = await PainRecord.countDocuments({
            status: { $in: ['VERIFIED', 'MODIFIED_VERIFIED'] },
            suggestedStream: streamRegex,
            verifiedAt: { $gte: today }
        });

        const modifiedCases = await PainRecord.countDocuments({ status: 'MODIFIED_VERIFIED', suggestedStream: streamRegex });
        const records = await PainRecord.find({ suggestedStream: streamRegex }).sort({ timestamp: -1 }).limit(10);

        // Map records to include parsed patient data
        const recentActivity = records.map(r => {
            let patientName = r.patientName;
            let patientAge = r.patientAge;

            // If fields are missing or placeholders, try parsing from notes as fallback
            if (r.notes && (!patientName || patientName === 'Anonymous' || !patientAge || patientAge === 'N/A' || patientAge === 'Unknown')) {
                const nameMatch = r.notes.match(/Patient:\s*([^,]+)/);
                const ageMatch = r.notes.match(/Age:\s*([^,]+)/);
                if (nameMatch && (!patientName || patientName === 'Anonymous')) patientName = nameMatch[1].trim();
                if (ageMatch && (!patientAge || patientAge === 'N/A' || patientAge === 'Unknown')) patientAge = ageMatch[1].trim();
            }

            patientName = patientName || 'Anonymous';
            patientAge = patientAge || 'N/A';
            return {
                ...r.toObject(),
                id: r._id,
                patientName,
                patientAge
            };
        });

        res.json({ totalPending, verifiedToday, modifiedCases, recentActivity });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/cases', protectDoctorRoute, async (req, res) => {
    try {
        const stream = req.doctor.stream; // e.g. "Orthopedic"

        // Use a case-insensitive regex for the stream matching
        const streamRegex = new RegExp(`^${stream}$`, 'i');
        const records = await PainRecord.find({
            status: 'PENDING',
            suggestedStream: streamRegex
        }).sort({ timestamp: -1 });

        // Map records to include parsed patient data
        const cases = records.map(r => {
            let patientName = r.patientName;
            let patientAge = r.patientAge;

            // If fields are missing or placeholders, try parsing from notes as fallback
            if (r.notes && (!patientName || patientName === 'Anonymous' || !patientAge || patientAge === 'N/A' || patientAge === 'Unknown')) {
                const nameMatch = r.notes.match(/Patient:\s*([^,]+)/);
                const ageMatch = r.notes.match(/Age:\s*([^,]+)/);
                if (nameMatch && (!patientName || patientName === 'Anonymous')) patientName = nameMatch[1].trim();
                if (ageMatch && (!patientAge || patientAge === 'N/A' || patientAge === 'Unknown')) patientAge = ageMatch[1].trim();
            }

            patientName = patientName || 'Anonymous';
            patientAge = patientAge || 'N/A';
            return {
                ...r.toObject(),
                id: r._id,
                patientName,
                patientAge
            };
        });

        res.json(cases);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/case/:caseId', protectDoctorRoute, async (req, res) => {
    try {
        const r = await PainRecord.findById(req.params.caseId);
        if (!r) return res.status(404).json({ message: 'Case not found' });

        // Parse patient data
        let patientName = r.patientName || 'Unknown';
        let patientAge = r.patientAge || 'N/A';
        if (r.notes && (!r.patientName || !r.patientAge)) {
            const nameMatch = r.notes.match(/Patient:\s*([^,]+)/);
            const ageMatch = r.notes.match(/Age:\s*([^,]+)/);
            if (nameMatch) patientName = nameMatch[1].trim();
            if (ageMatch) patientAge = ageMatch[1].trim();
        }

        const mappedCase = {
            ...r.toObject(),
            id: r._id,
            patientName,
            patientAge
        };

        res.json(mappedCase);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/verify-case', protectDoctorRoute, async (req, res) => {
    try {
        const { caseId, updatedAnalysis, updatedStream, updatedRiskLevel, doctorNotes, status } = req.body;

        // Map Doctor Portal statuses (APPROVE, MODIFIED_VERIFIED, REJECTED)
        let targetStatus = status;
        if (status === 'APPROVE') targetStatus = 'VERIFIED';
        if (status === 'DRAFT') targetStatus = 'PENDING';

        const originalRecord = await PainRecord.findById(caseId);
        if (!originalRecord) return res.status(404).json({ message: 'Case not found' });

        let finalAnalysis = updatedAnalysis;

        // If the patient requested a localized language, ensure the doctor's edits (English) are translated back.
        if (originalRecord.language && originalRecord.language !== 'en') {
            const targetLang = originalRecord.language;

            // If updatedAnalysis is nested (contains 'english'), use that. Otherwise use the whole thing as English base.
            const englishBase = updatedAnalysis.english || updatedAnalysis;

            console.log(`[Verify-Case] Translating doctor edits into: ${targetLang}`);
            const localizedTranslated = await translateObject(englishBase, targetLang);

            finalAnalysis = {
                english: englishBase,
                localized: localizedTranslated
            };
        }

        const updated = await PainRecord.findByIdAndUpdate(caseId, {
            status: targetStatus,
            aiAnalysis: finalAnalysis,
            suggestedStream: updatedStream,
            riskLevel: updatedRiskLevel,
            doctorNotes,
            verifiedBy: req.doctor.doctorId,
            verifiedAt: new Date()
        }, { new: true });

        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ============================================================
// GEMINI AI ENDPOINTS (Migrated from Hackathon)
// ============================================================

// Simple in-memory caches
const suggestionsCache = new Map();
const patientAnalysisCache = new Map();

async function callGeminiWithRetry(prompt, systemInstruction, responseMimeType = "application/json", retries = 3, delay = 3000) {
    // Corrected model name to gemini-2.5-flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    // Merge system instruction into the prompt for better compatibility
    const fullPrompt = `${systemInstruction}\n\nSTRICT INSTRUCTION: Your response must be a valid JSON object only. Do not include markdown code blocks (like \`\`\`json) or any other text.\n\nPROMPT: ${prompt}`;

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: fullPrompt }] }]
                })
            });

            if (response.ok) {
                return await response.json();
            }

            if (response.status === 429) {
                console.warn(`Gemini API 429 received. Quota exceeded. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
                if (i === retries - 1) throw new Error('Gemini API Error: 429 - Quota exhausted after all retries.');
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
                continue;
            }

            const errText = await response.text();
            throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
        } catch (error) {
            if (i === retries - 1) throw error;
            console.warn(`Gemini API error: ${error.message}. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }
    throw new Error('Gemini API Error: Retry loop exhausted without completion.');
}

async function translateObject(obj, targetLanguage) {
    if (!obj || !targetLanguage || targetLanguage === 'en' || targetLanguage.toLowerCase() === 'english') return obj;

    // Ensure we have a valid 2-letter language code
    const langMap = {
        'telugu': 'te',
        'hindi': 'hi',
        'tamil': 'ta',
        'kannada': 'kn',
        'malayalam': 'ml',
        'spanish': 'es',
        'french': 'fr'
    };

    let targetCode = targetLanguage.toLowerCase();
    if (targetCode.length > 2) {
        targetCode = langMap[targetCode] || 'en';
    }

    if (targetCode === 'en') return obj;

    // Helper to extract texts to translate and their paths
    const paths = [];
    const texts = [];

    function extractTexts(current, path) {
        if (typeof current === 'string') {
            paths.push(path);
            texts.push(current);
        } else if (Array.isArray(current)) {
            current.forEach((val, idx) => extractTexts(val, [...path, idx]));
        } else if (current !== null && typeof current === 'object') {
            Object.keys(current).forEach(key => extractTexts(current[key], [...path, key]));
        }
    }

    extractTexts(obj, []);

    if (texts.length === 0) return obj;

    const translatedTexts = [];
    const CHUNK_SIZE = 3; // Small chunks to avoid 503 limits on big arrays

    for (let i = 0; i < texts.length; i += CHUNK_SIZE) {
        const chunk = texts.slice(i, i + CHUNK_SIZE);
        let chunkSuccess = false;

        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const response = await fetch('https://api.langbly.com/language/translate/v2', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.LANGBLY_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        q: chunk,
                        target: targetCode,
                        format: 'text'
                    })
                });

                if (!response.ok) {
                    console.error(`Langbly Translation failed (attempt ${attempt + 1}) with status:`, response.status);
                    if (attempt === 2) throw new Error(`Status ${response.status}`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                    continue;
                }

                const data = await response.json();
                const translations = data.data?.translations;
                if (!translations || !Array.isArray(translations)) throw new Error("Translation payload missing");

                translations.forEach(t => translatedTexts.push(t.translatedText));
                chunkSuccess = true;
                break;
            } catch (e) {
                console.error(`Langbly Translation error for chunk (attempt ${attempt + 1}):`, e.message);
                if (attempt === 2) return obj; // fallback to original on persistent failure
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }
        if (!chunkSuccess) return obj;
    }

    // Reconstruct the translated object
    const translatedObj = JSON.parse(JSON.stringify(obj));

    paths.forEach((path, i) => {
        let current = translatedObj;
        for (let j = 0; j < path.length - 1; j++) {
            current = current[path[j]];
        }
        if (translatedTexts[i]) {
            current[path[path.length - 1]] = translatedTexts[i];
        }
    });

    return translatedObj;

}

router.post('/analyze-patient', async (req, res) => {
    try {
        const { patientName, patientAge, painLocation, severity, duration, notes, additionalSymptoms, language } = req.body;

        // Check cache first
        const cacheKey = JSON.stringify({ patientName, patientAge, painLocation, severity, duration, notes, additionalSymptoms });
        if (patientAnalysisCache.has(cacheKey)) {
            console.log('Serving patient analysis from cache.');
            let cachedResult = patientAnalysisCache.get(cacheKey);

            // Translate into localized language using Langbly if requested
            const requestedLang = language || 'English';
            if (requestedLang.toLowerCase() !== 'english' && requestedLang.toLowerCase() !== 'en') {
                const localized = await translateObject(cachedResult, requestedLang);
                cachedResult = {
                    english: cachedResult,
                    localized: localized
                };
            }
            return res.json({ result: cachedResult });
        }

        const prompt = `Medical assessment for localized pain.
Patient Details:
- Name: ${patientName || 'Unknown'}
- Age: ${patientAge || 'Unknown'}

Pain Details:
- Location: ${painLocation || 'Unknown'}
- Intensity: ${severity || 'Unknown'}
- Duration: ${duration || 'Unknown'}
- Context/Notes: ${notes || 'None'}
- Additional Symptoms/Injury: ${additionalSymptoms || 'None'}
- Requested Language: ${language || 'English'}

IMPORTANT: ALWAYS return the report strictly in English. NEVER translate the structure or content into another language yourself.
Do NOT nest the report inside "english" or "localized" keys. Return the exact JSON structure below.

The JSON structure MUST use these exact keys:
{
  "typesOfPain": ["type 1", "type 2"],
  "possibleDiseases": ["disease 1", "disease 2"],
  "causes": ["cause 1", "cause 2"],
  "riskLevel": "Low/Medium/High/Critical",
  "homeRemedies": ["remedy 1", "remedy 2"],
  "foodGuidance": ["tip 1", "tip 2"],
  "medicineGuidance": ["guideline 1", "guideline 2"],
  "doctorConsultation": ["rule 1", "rule 2"],
  "preventionTips": ["tip 1", "tip 2"],
  "emergencyWarningSigns": ["sign 1", "sign 2"]
}
`;

        try {
            const data = await callGeminiWithRetry(prompt, 'You are an advanced AI medical assistant providing localized pain assessment.');
            const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

            let finalResult = resultText;
            try {
                // Strip markdown code blocks if present
                let cleanStr = resultText.replace(/```json/gi, '').replace(/```/gi, '').trim();
                const jsonMatch = cleanStr.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    finalResult = JSON.parse(jsonMatch[0]);
                } else {
                    finalResult = { raw: resultText };
                }
            } catch (e) {
                console.error("JSON parse error in analyze-patient:", e);
                finalResult = { raw: resultText };
            }

            // Translate into localized language using Langbly if requested
            const requestedLang = req.body.language || 'English';
            let finalOutput = finalResult;
            if (requestedLang.toLowerCase() !== 'english' && requestedLang.toLowerCase() !== 'en') {
                const localized = await translateObject(finalResult, requestedLang);
                finalOutput = {
                    english: finalResult,
                    localized: localized
                };
            }

            // Save standard English result to cache for future requests
            patientAnalysisCache.set(cacheKey, finalResult);

            res.json({ result: finalOutput });
        } catch (geminiError) {
            console.error('Gemini API exhausted or failed. Using medical fallback for patient analysis.', geminiError.message);

            // Comprehensive medical fallback for localized pain
            let fallback = {
                typesOfPain: ["Somatic localized pain", "Musculoskeletal tension"],
                possibleDiseases: ["Muscle strain", "Minor inflammation", "Local tissue fatigue"],
                causes: ["Overuse or repetitive motion", "Postural stress", "Minor physical impact"],
                riskLevel: severity === 'High' ? "Moderate" : "Low",
                homeRemedies: ["Rest the affected area", "Apply ice pack for 15 mins", "Gentle range-of-motion stretching"],
                foodGuidance: ["Stay hydrated (8+ glasses of water)", "Increase magnesium-rich foods (spinach, nuts)", "Vitamin C for tissue repair"],
                medicineGuidance: ["Consider OTC Ibuprofen or Paracetamol for pain", "Topical pain relief creams", "Consult pharmacist for dosage"],
                doctorConsultation: ["If pain persists for more than 72 hours", "If you develop fever or redness", "If mobility is severely restricted"],
                preventionTips: ["Regular stretching before activity", "Improve ergonomic setup", "Avoid lifting heavy objects temporarily"],
                emergencyWarningSigns: ["Sudden numbness or tingling", "Loss of bladder/bowel control", "Severe, worsening localized swelling"]
            };

            const requestedLang = language || 'English';
            let finalOutput = fallback;
            if (requestedLang.toLowerCase() !== 'english' && requestedLang.toLowerCase() !== 'en') {
                const localizedFallback = await translateObject(fallback, requestedLang);
                finalOutput = {
                    english: fallback,
                    localized: localizedFallback
                };
            }

            res.json({ result: finalOutput });
        }
    } catch (error) {
        console.error('Error in analyze-patient:', error);
        res.status(500).json({ error: 'Failed to analyze patient data.' });
    }
});

router.post('/analyze-doctor', upload.array('images', 5), async (req, res) => {
    try {
        const { theme, partName, bp, sugar, heartbeat, bloodlevel, symptoms, painIntensity, painStart } = req.body;

        const uploadedFilesCount = req.files ? req.files.length : 0;
        const uploadNote = uploadedFilesCount > 0 ? `[Note: Patient provided ${uploadedFilesCount} scanning reports/images.]\n` : '';

        const prompt = `You are a strict clinical AI performing a live diagnosis.
System: ${theme}
Structure Focused On: ${partName}

Patient Symptoms and Vitals Provided:
- Blood Pressure: ${bp || 'Not provided'}
- Sugar Level: ${sugar || 'Not provided'}
- Heart Rate: ${heartbeat || 'Not provided'}
- Blood Level: ${bloodlevel || 'Not provided'}
- Symptoms: ${symptoms || 'None'}
- Pain Intensity: ${painIntensity || 'Normal'}
- When Pain Started: ${painStart || 'Not provided'}
${uploadNote}

CRITICAL RULES:
1. ABSOLUTELY NO TEXTBOOK DEFINITIONS. Do NOT tell the doctor what the ${partName} is. They already know.
2. Every single sentence MUST be a dynamic analysis of the patient's submitted form data.
3. If they change the inputs, your entire generated response must change dramatically.

Return valid JSON using strictly these keys:
{
  "anatomyDescription": "Analyze the anatomical state of the ${partName} specifically given the patient's exact BP, Sugar, and Symptoms. No boilerplate definitions.",
  "function": "Describe ONLY how the patient's specific presentation is impacting the normal function of this structure.",
  "commonDisorders": ["List 2-3 specific, dynamic potential diagnoses derived PURELY from the numerical vitals and text symptoms provided."],
  "symptoms": ["Detailed dynamic breakdown of why the patient has these exact symptoms and numbers.", "Pathological correlation."],
  "clinicalRelevance": "Urgency assessment (e.g., Code Red, observation) derived entirely from their specific pain intensity and vitals.",
  "diagnosticMethods": ["What exact imaging or lab test is needed right now for this patient's numbers?"]
}`;
        const data = await callGeminiWithRetry(prompt, 'You are an advanced AI medical assistant providing anatomical analysis to doctors.');
        const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

        let finalResult = resultText;
        try {
            const jsonMatch = resultText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                finalResult = JSON.parse(jsonMatch[0]);
            } else {
                finalResult = { raw: resultText };
            }
        } catch (e) {
            console.error("JSON parse error in analyze-doctor:", e);
            finalResult = { raw: resultText };
        }

        res.json({ result: finalResult });
    } catch (error) {
        console.error('Error in analyze-doctor endpoint:', error);
        res.status(500).json({ error: 'Failed to analyze doctor data.', details: error.message });
    }
});

router.post('/health-suggestions', async (req, res) => {
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

        // Check cache first
        const cacheKey = JSON.stringify({ age, gender, bp, sugar, hr });
        if (suggestionsCache.has(cacheKey)) {
            console.log('Serving health suggestions from cache.');
            return res.json({ result: suggestionsCache.get(cacheKey) });
        }

        try {
            const data = await callGeminiWithRetry(prompt, 'You are a concise, helpful virtual health assistant.');
            const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

            let finalResult = resultText;
            try {
                let cleanStr = resultText.replace(/```json/gi, '').replace(/```/gi, '').trim();
                const jsonMatch = cleanStr.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    finalResult = JSON.parse(jsonMatch[0]);
                } else {
                    finalResult = resultText;
                }
            } catch (e) {
                console.error("JSON parse error in health-suggestions:", e);
                finalResult = resultText;
            }

            res.json({ result: finalResult });
        } catch (geminiError) {
            console.error('Gemini API exhausted or failed. Using fallback health suggestions.', geminiError.message);

            // Hardcoded medical fallbacks based on vitals range
            let fallback = [
                "Monitor your vitals daily and keep a detailed log for your physician.",
                "Ensure balanced hydration (approx. 2-3 liters of water per day).",
                "Maintain a consistent sleep schedule to support hormonal balance.",
                "Incorporate 30 minutes of light physical activity like walking.",
                "Limit sodium intake and processed foods to support heart health."
            ];

            // Specific vitals-based adjustments
            if (bp && (parseInt(bp.split('/')[0]) > 140)) {
                fallback[0] = "Prioritize stress management and low-sodium diet due to elevated BP.";
            }
            if (sugar && parseInt(sugar) > 140) {
                fallback[1] = "Reduce refined sugar and simple carbohydrate intake.";
            }
            if (hr && parseInt(hr) > 100) {
                fallback[3] = "Practice deep breathing exercises to help regulate heart rate.";
            }

            res.json({ result: fallback });
        }
    } catch (error) {
        console.error('Error in health-suggestions:', error);
        res.status(500).json({ error: 'Failed to fetch suggestions.', details: error.message });
    }
});

// ============================================================
// DOCTOR VERIFICATION HELPERS
// ============================================================

async function validateMedicalContent(doctorAnalysis) {
    try {
        let textBlock = "";
        if (typeof doctorAnalysis === 'string') {
            textBlock = doctorAnalysis;
        } else if (typeof doctorAnalysis === 'object' && doctorAnalysis !== null) {
            textBlock = Object.values(doctorAnalysis).map(val =>
                Array.isArray(val) ? val.join(", ") : String(val)
            ).join(" ");
        }

        const prompt = `CRITICAL MEDICAL CONTENT AUDIT:
Determine if the following text is EXCLUSIVELY and GENUINELY a medical, healthcare, or clinical analysis.

STRICT REJECTION RULES:
- If the text contains ANY mention of: banking, finance, account numbers, transactions, money, shopping, customer service, or anything unrelated to clinical health, respond "NO".
- If the text is general conversation or nonsensical, respond "NO".
- If the text is a legitimate medical report or clinical advice, respond "YES".

Respond with exactly one word: YES or NO.

Content:
"${textBlock}"

Decision:`;

        const data = await callGeminiWithRetry(prompt, "You are a hardline medical data auditor. You have a zero-tolerance policy for unrelated content.");
        const resultText = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
        console.log(`[DEBUG] Gemini Validation Raw Response: "${resultText}"`);

        let decision = resultText.toUpperCase();
        try {
            const cleanJson = resultText.replace(/```json/gi, '').replace(/```/gi, '').trim();
            const parsed = JSON.parse(cleanJson);
            if (parsed.DECISION) decision = parsed.DECISION.toUpperCase();
            else if (parsed.decision) decision = parsed.decision.toUpperCase();
            else if (parsed.Decision) decision = parsed.Decision.toUpperCase();
        } catch (e) {
        }

        return decision.includes("YES") && !decision.includes("NO");
    } catch (error) {
        console.error("Gemini Validation Error:", error);
        return false;
    }
}

function calculateAiAccuracy(aiAnalysis, doctorAnalysis) {
    const fields = [
        "typesOfPain", "possibleDiseases", "causesOfProblem", "riskLevel", "homeRemedies",
        "foodDeficiencyGuidance", "medicinesGuidance", "doctorConsultation", "preventionTips", "emergencyWarningSigns"
    ];

    const mapping = {
        "causesOfProblem": "causes",
        "foodDeficiencyGuidance": "foodGuidance",
        "medicinesGuidance": "medicineGuidance"
    };

    let matchingFields = 0;
    fields.forEach(field => {
        const aiField = mapping[field] || field;

        const aiVal = (aiAnalysis[aiField] || "").toString().toLowerCase().trim();
        const docVal = (doctorAnalysis[field] || "").toString().toLowerCase().trim();

        if (aiVal === docVal || (aiVal && docVal && (aiVal.includes(docVal) || docVal.includes(aiVal)))) {
            matchingFields++;
        }
    });

    const aiAccuracy = (matchingFields / fields.length) * 100;
    return {
        aiAccuracy,
        doctorCorrection: 100 - aiAccuracy
    };
}

function getEnglishAnalysis(analysis) {
    if (!analysis) return {};
    if (analysis.english) return analysis.english;
    if (typeof analysis === 'string') {
        try {
            return JSON.parse(analysis);
        } catch (e) {
            return {};
        }
    }
    return analysis;
}

// ============================================================
// DOCTOR VERIFICATION ROUTES
// ============================================================

// 1. Reject Button
router.post('/doctor/reject-report', protectDoctorRoute, async (req, res) => {
    try {
        const { recordId, rejectionReason } = req.body;
        const doctor = await Doctor.findOne({ doctorId: req.doctor.doctorId });

        const updated = await PainRecord.findByIdAndUpdate(recordId, {
            verificationStatus: 'rejected',
            rejectionReason: rejectionReason || "",
            doctorId: doctor ? doctor._id : null,
            rejectedAt: new Date(),
            status: 'REJECTED'
        }, { new: true });

        if (!updated) return res.status(404).json({ success: false, message: "Record not found" });
        res.json({ success: true, message: "Report rejected successfully." });
    } catch (error) {
        console.error("Reject report error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Approve Button
router.post('/doctor/approve-report', protectDoctorRoute, async (req, res) => {
    try {
        const { recordId } = req.body;
        const record = await PainRecord.findById(recordId);
        if (!record) return res.status(404).json({ success: false, message: "Record not found" });

        const doctor = await Doctor.findOne({ doctorId: req.doctor.doctorId });
        const aiAnalysis = getEnglishAnalysis(record.aiAnalysis);

        record.doctorAnalysis = aiAnalysis;
        record.verificationStatus = 'approved';
        record.doctorId = doctor ? doctor._id : null;
        record.approvedAt = new Date();
        record.aiAccuracy = 100;
        record.doctorCorrection = 0;
        record.status = 'VERIFIED';

        await record.save();
        res.json({ success: true, message: "Report approved with 100% AI accuracy." });
    } catch (error) {
        console.error("Approve report error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. Modify & Approve Button
router.post('/doctor/modify-approve-report', protectDoctorRoute, async (req, res) => {
    try {
        const { recordId, doctorAnalysis } = req.body;

        const isValid = await validateMedicalContent(doctorAnalysis);
        if (!isValid) {
            return res.json({
                success: false,
                message: "This data is not related to health."
            });
        }

        const record = await PainRecord.findById(recordId);
        if (!record) return res.status(404).json({ success: false, message: "Record not found" });

        const doctor = await Doctor.findOne({ doctorId: req.doctor.doctorId });
        const aiAnalysis = getEnglishAnalysis(record.aiAnalysis);

        const { aiAccuracy, doctorCorrection } = calculateAiAccuracy(aiAnalysis, doctorAnalysis);

        record.doctorAnalysis = doctorAnalysis;
        record.verificationStatus = 'modifiedApproved';
        record.doctorId = doctor ? doctor._id : null;
        record.approvedAt = new Date();
        record.aiAccuracy = aiAccuracy;
        record.doctorCorrection = doctorCorrection;
        record.status = 'MODIFIED_VERIFIED';

        await record.save();
        res.json({
            success: true,
            message: "Modified report approved successfully.",
            aiAccuracy,
            doctorCorrection
        });
    } catch (error) {
        console.error("Modify & Approve report error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// Text to Speech (Camb AI Integration)
// ============================================================
router.post('/tts', async (req, res) => {
    try {
        const { text, language } = req.body;
        
        let languageId = 'en-us';
        if (language && (language.toLowerCase() === 'te' || language.toLowerCase() === 'telugu')) {
            languageId = 'te-in';
        }

        // Helper to split text into chunks of <= 450 characters without breaking words
        function splitText(str, maxLength = 450) {
            const chunks = [];
            let start = 0;
            while (start < str.length) {
                if (str.length - start <= maxLength) {
                    chunks.push(str.slice(start).trim());
                    break;
                }
                let end = start + maxLength;
                let lastSpace = str.lastIndexOf(' ', end);
                let lastPunc = Math.max(
                    str.lastIndexOf('.', end),
                    str.lastIndexOf('!', end),
                    str.lastIndexOf('?', end),
                    str.lastIndexOf('\n', end)
                );
                // Prefer punctuation if it's within the last 150 chars of the chunk limit
                if (lastPunc > start && (end - lastPunc) < 150) {
                    end = lastPunc + 1;
                } else if (lastSpace > start) {
                    end = lastSpace;
                }
                chunks.push(str.slice(start, end).trim());
                start = end;
            }
            return chunks.filter(c => c.length > 0);
        }

        const chunks = splitText(text || "", 450);
        let combinedBuffer = Buffer.alloc(0);

        for (const chunk of chunks) {
            const payload = {
                text: chunk,
                voice_id: 147319, // Verified multilingual voice on Camb AI
                language: languageId
            };

            let chunkSuccess = false;
            for (let retry = 0; retry < 3; retry++) {
                try {
                    const response = await fetch(`https://client.camb.ai/apis/tts-stream`, {
                        method: 'POST',
                        headers: { 
                            'x-api-key': process.env.CAMBAI_API_KEY,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error(`Camb AI TTS error HTTP status ${response.status} (retry ${retry}):`, errorText.substring(0, 200));
                        if (retry < 2) {
                            await new Promise(r => setTimeout(r, 1000));
                            continue;
                        }
                        
                        // If it fails on the first chunk, throw error. If it fails later, return what we have so far
                        if (combinedBuffer.length === 0) {
                            return res.status(response.status).json({ success: false, error: 'Camb AI API failed: ' + errorText.substring(0, 100) });
                        } else {
                            break;
                        }
                    }
                    
                    const arrayBuffer = await response.arrayBuffer();
                    combinedBuffer = Buffer.concat([combinedBuffer, Buffer.from(arrayBuffer)]);
                    chunkSuccess = true;
                    break;
                } catch (e) {
                    console.error(`Camb AI TTS fetch error (retry ${retry}):`, e.message);
                    if (retry < 2) {
                        await new Promise(r => setTimeout(r, 1000));
                    } else if (combinedBuffer.length === 0) {
                        throw e;
                    }
                }
            }
            if (!chunkSuccess && combinedBuffer.length > 0) break;
        }
        
        // Stream the stitched audio buffer directly to the client
        res.set('Content-Type', 'audio/mpeg');
        res.send(combinedBuffer);

    } catch (err) {
        console.error('TTS endpoint error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================================
// MEDCONNECT — Doctor Social Network Routes
// ============================================================
const MedConnectUser = require('./medconnectUserModel');
const Post = require('./postModel');

const medConnectJwt = process.env.JWT_SECRET || 'super-secret-doctor-key-12345';

// Middleware to verify MedConnect JWT
function medAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
    try {
        const decoded = jwt.verify(auth.split(' ')[1], medConnectJwt);
        req.medDoctor = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}

// POST /api/medconnect/register
router.post('/medconnect/register', async (req, res) => {
    try {
        const { name, password, specialty } = req.body;
        if (!name || !password) return res.status(400).json({ message: 'Name and password required' });
        const existing = await MedConnectUser.findOne({ name: new RegExp(`^${name}$`, 'i') });
        if (existing) return res.status(409).json({ message: 'Name already taken' });
        const user = await MedConnectUser.create({ name, password, specialty: specialty || 'General' });
        const token = jwt.sign({ id: user._id, name: user.name, specialty: user.specialty }, medConnectJwt, { expiresIn: '7d' });
        res.json({ token, id: user._id, name: user.name, specialty: user.specialty });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/medconnect/login
router.post('/medconnect/login', async (req, res) => {
    try {
        const { name, password } = req.body;
        if (!name || !password) return res.status(400).json({ message: 'Name and password required' });
        const user = await MedConnectUser.findOne({ name: new RegExp(`^${name}$`, 'i') });
        if (!user || user.password !== password) return res.status(401).json({ message: 'Invalid credentials' });
        const token = jwt.sign({ id: user._id, name: user.name, specialty: user.specialty }, medConnectJwt, { expiresIn: '7d' });
        res.json({ token, id: user._id, name: user.name, specialty: user.specialty });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/medconnect/posts — all posts newest first
router.get('/medconnect/posts', async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 }).limit(50);
        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/medconnect/posts — create a post (expanded medical fields)
router.post('/medconnect/posts', medAuth, upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'labTests', maxCount: 1 },
    { name: 'scanningReports', maxCount: 1 },
    { name: 'clinicalNotes', maxCount: 1 }
]), async (req, res) => {
    try {
        const { 
            text, tags, symptoms, duration, age, gender, bp, sugar, heartRate 
        } = req.body;
        
        if (!text || !text.trim()) return res.status(400).json({ message: 'Text is required' });
        
        const parsedTags = tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean)) : [];
        
        // Handle images
        const imageUrl = req.files['image'] ? req.files['image'][0].filename : null;
        const labTestFindingImages = req.files['labTests'] ? req.files['labTests'].map(f => f.filename) : [];
        const scanningReportsImages = req.files['scanningReports'] ? req.files['scanningReports'].map(f => f.filename) : [];
        const clinicalNotesImages = req.files['clinicalNotes'] ? req.files['clinicalNotes'].map(f => f.filename) : [];

        const post = await Post.create({
            authorId: req.medDoctor.id,
            authorName: req.medDoctor.name,
            authorSpecialty: req.medDoctor.specialty,
            text: text.trim(),
            imageUrl,
            
            // New medical fields
            symptoms,
            duration,
            age,
            gender,
            labTestFindingImages,
            scanningReportsImages,
            clinicalNotesImages,
            bp,
            sugar,
            heartRate,
            
            tags: parsedTags
        });
        res.json(post);
    } catch (err) {
        console.error('Create Post Error:', err);
        res.status(500).json({ message: err.message });
    }
});

// POST /api/medconnect/posts/:id/comment — add comment
router.post('/medconnect/posts/:id/comment', medAuth, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || !text.trim()) return res.status(400).json({ message: 'Comment text required' });
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        const comment = { authorId: req.medDoctor.id, authorName: req.medDoctor.name, authorSpecialty: req.medDoctor.specialty, text: text.trim() };
        post.comments.push(comment);
        await post.save();
        // Notify post author if it's not themselves
        if (String(post.authorId) !== String(req.medDoctor.id)) {
            await MedConnectUser.findByIdAndUpdate(post.authorId, {
                $push: { notifications: { type: 'comment', fromDoctorName: req.medDoctor.name, postId: post._id, postTextSnippet: post.text.substring(0, 60) } }
            });
        }
        res.json(post);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/medconnect/posts/:id/agree — toggle agree
router.post('/medconnect/posts/:id/agree', medAuth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        const userId = req.medDoctor.id;
        const alreadyAgreed = post.agrees.map(String).includes(String(userId));
        if (alreadyAgreed) {
            post.agrees = post.agrees.filter(id => String(id) !== String(userId));
        } else {
            post.agrees.push(userId);
            post.disagrees = post.disagrees.filter(id => String(id) !== String(userId));
            if (String(post.authorId) !== String(userId)) {
                await MedConnectUser.findByIdAndUpdate(post.authorId, {
                    $push: { notifications: { type: 'agree', fromDoctorName: req.medDoctor.name, postId: post._id, postTextSnippet: post.text.substring(0, 60) } }
                });
            }
        }
        await post.save();
        res.json({ agrees: post.agrees.length, disagrees: post.disagrees.length, userAgreed: !alreadyAgreed, userDisagreed: false });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/medconnect/posts/:id/disagree — toggle disagree
router.post('/medconnect/posts/:id/disagree', medAuth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        const userId = req.medDoctor.id;
        const alreadyDisagreed = post.disagrees.map(String).includes(String(userId));
        if (alreadyDisagreed) {
            post.disagrees = post.disagrees.filter(id => String(id) !== String(userId));
        } else {
            post.disagrees.push(userId);
            post.agrees = post.agrees.filter(id => String(id) !== String(userId));
            if (String(post.authorId) !== String(userId)) {
                await MedConnectUser.findByIdAndUpdate(post.authorId, {
                    $push: { notifications: { type: 'disagree', fromDoctorName: req.medDoctor.name, postId: post._id, postTextSnippet: post.text.substring(0, 60) } }
                });
            }
        }
        await post.save();
        res.json({ agrees: post.agrees.length, disagrees: post.disagrees.length, userAgreed: false, userDisagreed: !alreadyDisagreed });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/medconnect/search?q= — search posts, doctors, tags (Enhanced with medical criteria)
router.get('/medconnect/search', async (req, res) => {
    try {
        const { 
            q, symptoms, age, gender, bp, sugar, heartRate, duration
        } = req.query;

        const results = {
            posts: [],
            relatedPosts: [],
            doctors: []
        };

        // 1. Search Doctors (Legacy logic)
        if (q) {
            const drRegex = new RegExp(q, 'i');
            results.doctors = await MedConnectUser.find({ 
                $or: [{ name: drRegex }, { specialty: drRegex }, { bio: drRegex }] 
            }).select('-password -notifications').limit(10);
        }

        // 2. Search Posts (Structured + Weighted)
        const criteria = {};
        if (symptoms) criteria.symptoms = new RegExp(symptoms, 'i');
        if (age) criteria.age = age;
        if (gender) criteria.gender = gender;
        if (bp) criteria.bp = bp;
        if (sugar) criteria.sugar = sugar;
        if (heartRate) criteria.heartRate = heartRate;
        if (duration) criteria.duration = new RegExp(duration, 'i');

        // If no structured criteria, use legacy text search
        if (Object.keys(criteria).length === 0) {
            if (q) {
                const postRegex = new RegExp(q, 'i');
                results.posts = await Post.find({ 
                    $or: [{ text: postRegex }, { tags: postRegex }, { authorName: postRegex }, { symptoms: postRegex }] 
                }).sort({ createdAt: -1 }).limit(20);
            }
        } else {
            // Case 1: Exact matches (ALL criteria meet)
            results.posts = await Post.find(criteria).sort({ createdAt: -1 }).limit(20);

            // Case 2: Partial matches (Related data)
            // We search for posts matching ANY of the criteria but not already in the 'posts' list
            const matchedIds = results.posts.map(p => p._id);
            const orCriteria = Object.keys(criteria).map(key => ({ [key]: criteria[key] }));
            
            results.relatedPosts = await Post.find({
                $and: [
                    { _id: { $nin: matchedIds } },
                    { $or: orCriteria }
                ]
            }).sort({ createdAt: -1 }).limit(20);
        }

        // Check if anything found at all
        if (results.posts.length === 0 && results.relatedPosts.length === 0 && results.doctors.length === 0) {
            return res.json({ message: "No data available", posts: [], relatedPosts: [], doctors: [] });
        }

        res.json(results);
    } catch (err) {
        console.error('Search Error:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET /api/medconnect/profile/:doctorId
router.get('/medconnect/profile/:doctorId', async (req, res) => {
    try {
        const user = await MedConnectUser.findById(req.params.doctorId).select('-password');
        if (!user) return res.status(404).json({ message: 'Doctor not found' });
        const posts = await Post.find({ authorId: user._id }).sort({ createdAt: -1 });
        // Mark notifications as read
        await MedConnectUser.findByIdAndUpdate(user._id, { $set: { 'notifications.$[].read': true } });
        res.json({ user, posts });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/medconnect/suggested/:doctorId — posts from same specialty domain
router.get('/medconnect/suggested/:doctorId', medAuth, async (req, res) => {
    try {
        const specialty = req.medDoctor.specialty;
        const posts = await Post.find({ authorSpecialty: specialty, authorId: { $ne: req.medDoctor.id } }).sort({ createdAt: -1 }).limit(10);
        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/medconnect/notifications — unread count for logged-in user
router.get('/medconnect/notifications', medAuth, async (req, res) => {
    try {
        const user = await MedConnectUser.findById(req.medDoctor.id).select('notifications');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ notifications: user.notifications, unread: user.notifications.filter(n => !n.read).length });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

