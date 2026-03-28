const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'MedConnectUser', required: true },
    authorName: { type: String, required: true },
    authorSpecialty: { type: String, default: 'General' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'MedConnectUser', required: true },
    authorName: { type: String, required: true },
    authorSpecialty: { type: String, default: 'General' },
    text: { type: String, required: true },
    imageUrl: { type: String, default: null }, // Legacy single image
    
    // New medical fields
    symptoms: { type: String },
    duration: { type: String },
    age: { type: String },
    gender: { type: String },
    labTestFindingImages: [{ type: String }],
    scanningReportsImages: [{ type: String }],
    clinicalNotesImages: [{ type: String }],
    bp: { type: String },
    sugar: { type: String },
    heartRate: { type: String },

    tags: [{ type: String }],
    comments: [commentSchema],
    agrees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MedConnectUser' }],
    disagrees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MedConnectUser' }],
    createdAt: { type: Date, default: Date.now }
});

// Text index for full-text search
postSchema.index({ text: 'text', tags: 'text', authorName: 'text', authorSpecialty: 'text', symptoms: 'text' });

module.exports = mongoose.model('Post', postSchema);
