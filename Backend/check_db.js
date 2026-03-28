const mongoose = require('mongoose');
const { PainRecord } = require('./painModel');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hospital_db')
    .then(async () => {
        console.log("Connected to DB, fetching last 5 records...");
        const records = await PainRecord.find().sort({ timestamp: -1 }).limit(5);
        records.forEach(r => {
            console.log(`\nID: ${r._id}`);
            console.log(`Time: ${new Date(r.timestamp).toISOString()}`);
            console.log(`Patient: ${r.patientName} (${r.patientAge} yrs)`);
            console.log(`Body Part/Mesh: ${r.meshName} / ${r.anatomicalRegion}`);
            console.log(`Suggested Stream: ${r.suggestedStream}`);
            console.log(`Status: ${r.status}`);
        });
        process.exit(0);
    })
    .catch(err => {
        console.error("DB Error:", err);
        process.exit(1);
    });
