const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
    doctorId: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    stream: { type: String, required: true, enum: ['Orthopedic', 'Neurology', 'Cardiology', 'General'] },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Doctor', doctorSchema);
