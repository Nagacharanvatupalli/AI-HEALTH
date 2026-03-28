import mongoose from 'mongoose';
const MONGO_URI = 'mongodb+srv://nishu:nishu%40312@health.74fuhrv.mongodb.net/?appName=health';

const painRecordSchema = new mongoose.Schema({
    meshName: String,
    anatomicalRegion: String,
    suggestedStream: String,
    status: String,
    timestamp: Date,
    notes: String
});

const PainRecord = mongoose.model('PainRecord', painRecordSchema);

async function dump() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');
        const records = await PainRecord.find({}).limit(10).lean();
        console.log(JSON.stringify(records, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

dump();
