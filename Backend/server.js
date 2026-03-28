const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const apiRoutes = require('./routes');

const app = express();
// Silence common internal Chrome DevTools requests
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
    res.status(404).json({ error: 'Not supported' });
});

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/anatomy_db';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Disable caching for development (ensures latest code is always served)
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// Serve static frontend files from the hackathon project explicitly
const hackathonPublicPath = path.join(__dirname, '../Frontend-main/public');
app.use(express.static(hackathonPublicPath));

// Also support specific static folders as redundancy
app.use('/js', express.static(path.join(hackathonPublicPath, 'js')));
app.use('/css', express.static(path.join(hackathonPublicPath, 'css')));

// Serve 3D models from the specific Windows path requested by the hackathon frontend
const modelsPath = 'C:\\Users\\LENOVO\\OneDrive\\Desktop\\Ai-health\\systems';
app.use('/models', express.static(modelsPath));

// Serve uploaded patient images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Use the assets folder from the doctor portal as it contains the bundled SPA files
app.use('/assets', express.static(path.join(__dirname, '../../doctor verification/dist/assets')));

// Serve Doctor Verification Portal
const doctorPortalPath = path.join(__dirname, '../../doctor verification/dist');
app.use('/doctor', express.static(doctorPortalPath));

// Fallback for Doctor Portal SPA (if accessed via /doctor/...)
app.get('/doctor/*', (req, res) => {
    res.sendFile(path.join(doctorPortalPath, 'index.html'));
});

// Serve MedConnect SPA
const medConnectPath = path.join(hackathonPublicPath, 'medconnect');
app.use('/medconnect', express.static(medConnectPath));
app.get('/medconnect/*', (req, res) => {
    res.sendFile(path.join(medConnectPath, 'index.html'));
});

// API routes
app.use('/api', apiRoutes);

// Catch-all: serve hackathon index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(hackathonPublicPath, 'index.html'));
});

// Helper for patient view
app.get('/patient', (req, res) => {
    res.sendFile(path.join(hackathonPublicPath, 'index.html'));
});

const Doctor = require('./doctorModel');

// Connect to MongoDB and start server
mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('✅ MongoDB connected successfully');

        // Seed default doctors if none exist
        try {
            const count = await Doctor.countDocuments();
            if (count === 0) {
                const defaultDoctors = [
                    { doctorId: "ORTHO01", password: "Ortho@123", stream: "Orthopedic", active: true },
                    { doctorId: "NEURO01", password: "Neuro@123", stream: "Neurology", active: true },
                    { doctorId: "CARDIO01", password: "Cardio@123", stream: "Cardiology", active: true },
                    { doctorId: "GEN01", password: "General@123", stream: "General", active: true }
                ];
                await Doctor.insertMany(defaultDoctors);
                console.log('✅ Default doctors seeded successfully');
            }
        } catch (seedErr) {
            console.error('⚠️ Could not seed doctors:', seedErr.message);
        }

        const server = app.listen(PORT, () => {
            console.log(`🏥 Anatomy Viewer running at http://localhost:${PORT}`);
        });
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`⚠️  Port ${PORT} in use. Killing existing process and retrying...`);
                const { execSync } = require('child_process');
                try {
                    execSync(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :${PORT}') do taskkill /F /PID %a`, { shell: 'cmd.exe', stdio: 'ignore' });
                } catch (e) { }
                setTimeout(() => app.listen(PORT, () => {
                    console.log(`🏥 Anatomy Viewer running at http://localhost:${PORT}`);
                }), 1000);
            }
        });
    })
    .catch(err => {
        console.error('❌ MongoDB connection failed:', err.message);
        console.log('⚠️  Starting server without database (pain data will not persist)');
        const server = app.listen(PORT, () => {
            console.log(`🏥 Anatomy Viewer running at http://localhost:${PORT} (no DB)`);
        });
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`⚠️  Port ${PORT} in use. Killing existing process and retrying...`);
                const { execSync } = require('child_process');
                try {
                    execSync(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :${PORT}') do taskkill /F /PID %a`, { shell: 'cmd.exe', stdio: 'ignore' });
                } catch (e) { }
                setTimeout(() => app.listen(PORT, () => {
                    console.log(`🏥 Anatomy Viewer running at http://localhost:${PORT} (no DB)`);
                }), 1000);
            }
        });
    });

// 404 Handler with logging (Fall-through)
app.use((req, res, next) => {
    console.warn(`[404] Not Found: ${req.method} ${req.url} (Original: ${req.originalUrl})`);
    res.status(404).send('Resource Not Found');
});

module.exports = app;
