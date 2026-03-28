const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    type: { type: String, enum: ['agree', 'disagree', 'comment'], required: true },
    fromDoctorName: { type: String, required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    postTextSnippet: { type: String },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const medconnectUserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    password: { type: String, required: true },
    specialty: {
        type: String,
        default: 'General',
        enum: ['Cardiology', 'Neurology', 'Orthopedic', 'Dermatology', 'Pediatrics',
               'Oncology', 'Radiology', 'Psychiatry', 'General Surgery', 'General']
    },
    bio: { type: String, default: '' },
    notifications: [notificationSchema],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MedConnectUser', medconnectUserSchema);
