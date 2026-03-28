const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI;

const PainRecordSchema = new mongoose.Schema({}, { strict: false });
const PainRecord = mongoose.model('PainRecord', PainRecordSchema);
const Doctor = mongoose.model('Doctor', new mongoose.Schema({}, { strict: false }));

async function checkData() {
    try {
        console.log('Connecting to:', MONGO_URI.substring(0, 20) + '...');
        await mongoose.connect(MONGO_URI);

        console.log('--- Pending (PENDING) Cases ---');
        const pending = await PainRecord.find({ status: 'PENDING' });
        console.log(`Total Pending: ${pending.length}`);
        pending.forEach(p => {
            console.log(`ID: ${p._id}, Stream: ${p.suggestedStream}, Part: ${p.meshName || p.anatomicalRegion}, Lang: ${p.language}`);
        });

        console.log('\n--- All Statuses ---');
        const counts = await PainRecord.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
        console.log(JSON.stringify(counts, null, 2));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkData();
