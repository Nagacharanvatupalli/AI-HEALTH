const mongoose = require('mongoose');
const PainRecord = require('./painModel');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log("Connected to Atlas, fetching last 3 records...");
        const records = await PainRecord.find().sort({ timestamp: -1 }).limit(3);
        records.forEach(r => {
            console.log(JSON.stringify(r.toObject(), null, 2));
        });
        process.exit(0);
    })
    .catch(err => {
        console.error("DB Error:", err);
        process.exit(1);
    });
