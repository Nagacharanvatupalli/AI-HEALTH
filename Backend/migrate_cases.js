const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI;

const PainRecordSchema = new mongoose.Schema({}, { strict: false });
const PainRecord = mongoose.model('PainRecord', PainRecordSchema);

async function migrate() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(MONGO_URI);

        const pending = await PainRecord.find({
            status: 'PENDING',
            $or: [
                { suggestedStream: { $exists: false } },
                { suggestedStream: null },
                { suggestedStream: 'General' }
            ]
        });

        console.log(`Found ${pending.length} cases to migrate.`);

        const ORTHO_KEYWORDS = ['knee', 'shoulder', 'bone', 'ankle', 'wrist', 'spine', 'elbow', 'hip', 'thigh', 'back', 'joint', 'మోకాలు', 'భుజం', 'ఎముక', 'వెన్నెముక', 'కీలు'];
        const NEURO_KEYWORDS = ['brain', 'head', 'nerve', 'neurology', 'skull', 'facial', 'మెదడు', 'తల', 'నరం'];
        const CARDIO_KEYWORDS = ['heart', 'chest', 'cardiology', 'vein', 'artery', 'blood', 'గుండె', 'ఛాతీ'];

        let updatedCount = 0;
        for (const record of pending) {
            const bp = (record.meshName || record.anatomicalRegion || '').toLowerCase();
            const analysisStr = JSON.stringify(record.aiAnalysis || {}).toLowerCase();

            let stream = 'General';
            if (ORTHO_KEYWORDS.some(k => bp.includes(k) || analysisStr.includes(k))) stream = 'Orthopedic';
            else if (NEURO_KEYWORDS.some(k => bp.includes(k) || analysisStr.includes(k))) stream = 'Neurology';
            else if (CARDIO_KEYWORDS.some(k => bp.includes(k) || analysisStr.includes(k))) stream = 'Cardiology';

            if (stream !== 'General') {
                await PainRecord.findByIdAndUpdate(record._id, { suggestedStream: stream });
                updatedCount++;
                console.log(`Migrated Case ${record._id}: Stream -> ${stream}`);
            }
        }

        console.log(`Successfully migrated ${updatedCount} cases.`);
        await mongoose.disconnect();
    } catch (err) {
        console.error('Migration failed:', err);
    }
}

migrate();
