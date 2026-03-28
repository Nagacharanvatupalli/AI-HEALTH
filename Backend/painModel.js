const mongoose = require('mongoose');

const painRecordSchema = new mongoose.Schema({
  meshName: {
    type: String,
    required: true,
    trim: true
  },
  anatomicalRegion: {
    type: String,
    required: true,
    trim: true
  },
  painLevel: {
    type: Number,
    required: true,
    min: 0,
    max: 10
  },
  painType: {
    type: String,
    enum: ['Acute', 'Chronic', 'Neuropathic', 'Referred', 'Visceral', 'Somatic', 'Other'],
    default: 'Acute'
  },
  duration: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  patientName: {
    type: String,
    trim: true
  },
  patientAge: {
    type: String,
    trim: true
  },
  painLocation: {
    type: String,
    trim: true
  },
  severity: {
    type: String,
    trim: true
  },
  additionalSymptoms: {
    type: String,
    trim: true
  },
  imageUrl: {
    type: String,
    default: null
  },
  xrayUrl: {
    type: String,
    default: null
  },
  aiAnalysis: {
    type: Object
  },
  riskLevel: {
    type: String
  },
  suggestedStream: {
    type: String,
    trim: true,
    default: 'General'
  },
  language: {
    type: String,
    default: 'en'
  },
  status: {
    type: String,
    enum: ['PENDING', 'VERIFIED', 'MODIFIED_VERIFIED', 'REJECTED'],
    default: 'PENDING'
  },
  doctorNotes: {
    type: String
  },
  verifiedBy: {
    type: String
  },
  verifiedAt: {
    type: Date
  },
  // New fields for Doctor Verification Workflow
  doctorAnalysis: {
    type: Object
  },
  aiAccuracy: {
    type: Number
  },
  doctorCorrection: {
    type: Number
  },
  verificationStatus: {
    type: String
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  approvedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
  },
  validationStatus: {
    type: Boolean
  },
  rejectionReason: {
    type: String
  }
});

module.exports = mongoose.model('PainRecord', painRecordSchema);
