# AI Health Assistant

An AI-powered health assistant platform with pain detection, doctor verification, and 3D body model visualization.

## Project Structure

```
AI-HealthAssistant/
├── Backend/              # Node.js + Express API server
├── Frontend-main/        # Patient-facing frontend (Node.js/Express + HTML)
├── doctor verification/  # Doctor portal (Vite + React)
└── systems/              # 3D GLB model assets (body systems)
```

## Modules

### Backend (`/Backend`)
- Node.js + Express REST API
- MongoDB integration for patient & doctor data
- AI-based pain analysis using Google Gemini
- JWT authentication & doctor verification middleware
- File upload handling for X-rays & pain site images

### Frontend - Patient Portal (`/Frontend-main`)
- Patient login and symptom submission form
- Image upload for pain site & X-ray
- AI result display with downloadable PDF report
- 3D human body model for pain location selection

### Doctor Portal (`/doctor verification`)
- Vite + React application
- Doctor registration and authentication
- View patient-submitted cases with AI analysis results
- Image and X-ray viewer

### 3D Model Assets (`/systems`)
- GLB format 3D models for human body systems
- Includes skeleton, circulatory, respiratory, nervous systems, and more

## Getting Started

### Backend
```bash
cd Backend
npm install
# Create .env with your MongoDB URI, JWT secret, and Gemini API key
npm start
```

### Frontend (Patient Portal)
```bash
cd Frontend-main
npm install
npm start
```

### Doctor Portal
```bash
cd "doctor verification"
npm install
npm run dev
```

## Tech Stack
- **Backend**: Node.js, Express, MongoDB, Mongoose, JWT, Google Gemini AI
- **Frontend**: HTML, CSS, JavaScript, Three.js (3D models)
- **Doctor Portal**: React, Vite
- **AI**: Google Gemini API for symptom/pain analysis
