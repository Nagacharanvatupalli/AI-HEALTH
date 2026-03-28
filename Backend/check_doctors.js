const mongoose = require('mongoose');
const Doctor = require('./doctorModel');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log("Connected to Atlas, fetching Doctors...");
        const doctors = await Doctor.find({});
        doctors.forEach(d => {
            console.log(`Doctor ID: ${d.doctorId}, Stream: ${d.stream}, Active: ${d.active}`);
        });
        process.exit(0);
    })
    .catch(err => {
        console.error("DB Error:", err);
        process.exit(1);
    });
