const VoiceAssistant = {
    synth: window.speechSynthesis,
    status: 'stopped', // 'stopped', 'playing', 'paused'
    utterancesToQueue: [],
    selectedVoice: null,

    init(containerId) {
        this.stop();

        // Preload voices
        if (this.synth.getVoices().length === 0) {
            this.synth.onvoiceschanged = () => {
                this.synth.getVoices();
            };
        }

        const container = document.getElementById(containerId);
        if (!container) return;

        const cards = Array.from(container.querySelectorAll('.result-card'));

        let emergencyCard = null;
        let otherCards = [];

        cards.forEach(card => {
            const titleEl = card.querySelector('h4');
            if (titleEl && titleEl.innerText.toLowerCase().includes('emergency warning signs')) {
                emergencyCard = card;
            } else {
                otherCards.push(card);
            }
        });

        // Ensure Emergency Warning Signs is at the end
        const sortedCards = emergencyCard ? [...otherCards, emergencyCard] : otherCards;

        this.utterancesToQueue = [];

        sortedCards.forEach(card => {
            const titleEl = card.querySelector('h4');
            if (titleEl) {
                const isEmergency = titleEl.innerText.toLowerCase().includes('emergency warning signs');

                this.utterancesToQueue.push({
                    text: titleEl.innerText,
                    rate: isEmergency ? 0.85 : 1,
                    pitch: isEmergency ? 1.1 : 1
                });

                // Get all paragraphs and list items in logical order
                const contentNodes = card.querySelectorAll('p, li');
                contentNodes.forEach(node => {
                    if (node.innerText.trim()) {
                        this.utterancesToQueue.push({
                            text: node.innerText.trim(),
                            rate: isEmergency ? 0.85 : 1,
                            pitch: isEmergency ? 1.0 : 1
                        });
                    }
                });
            } else {
                // For raw output where there are no h4s, just read paragraphs
                const pNodes = card.querySelectorAll('p');
                pNodes.forEach(p => {
                    if (p.innerText.trim()) {
                        this.utterancesToQueue.push({
                            text: p.innerText.trim(),
                            rate: 1, pitch: 1
                        });
                    }
                });
            }
        });
    },

    toggle() {
        const btn = document.getElementById('voice-assistant-btn');
        if (this.status === 'stopped') {
            if (this.utterancesToQueue && this.utterancesToQueue.length > 0) {
                this.status = 'playing';
                if (btn) btn.innerHTML = '<span style="margin-right:8px;">⏳</span> Generating...';

                const fullText = this.utterancesToQueue.map(u => u.text).join(' ');
                
                fetch('/api/tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: fullText, language: LanguageManager.current })
                })
                .then(res => {
                    if (!res.ok) throw new Error('TTS generation failed: ' + res.status);
                    return res.blob(); // Get audio stream
                })
                .then(blob => {
                    if (this.audioElement) {
                        this.audioElement.pause();
                        URL.revokeObjectURL(this.audioElement.src);
                    }
                    const audioUrl = URL.createObjectURL(blob);
                    this.audioElement = new Audio(audioUrl);
                    this.audioElement.onended = () => this.resetState();
                    this.audioElement.play();
                    
                    this.status = 'playing';
                    if (btn) btn.innerHTML = '<span style="margin-right:8px;">⏸</span> Pause Audio';
                })
                .catch(err => {
                    console.error("Camb AI TTS failed, falling back to built-in speech:", err);
                    this.status = 'playing';
                    if (btn) btn.innerHTML = '<span style="margin-right:8px;">⏸</span> Pause Audio';

                    if (!this.selectedVoice) {
                        const voices = this.synth.getVoices();
                        this.selectedVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Google UK English Female'))
                            || voices.find(v => v.name.toLowerCase().includes('natural') && v.lang.includes('en'))
                            || voices.find(v => v.name.includes('Microsoft Hazel') || v.name.includes('Microsoft Zira') || v.name.includes('Microsoft Mark'))
                            || voices.find(v => v.lang.startsWith('en'));
                    }

                    this.utterancesToQueue.forEach((item, index) => {
                        const u = new SpeechSynthesisUtterance(item.text);
                        if (this.selectedVoice) u.voice = this.selectedVoice;
                        u.rate = item.rate * 0.92;
                        u.pitch = item.pitch;

                        if (index === this.utterancesToQueue.length - 1) {
                            u.onend = () => this.resetState();
                        }
                        this.synth.speak(u);
                    });
                });
            }
        } else if (this.status === 'playing') {
            this.status = 'paused';
            if (this.audioElement) this.audioElement.pause();
            else this.synth.pause();
            if (btn) btn.innerHTML = '<span style="margin-right:8px;">▶</span> Resume Audio';
        } else if (this.status === 'paused') {
            this.status = 'playing';
            if (this.audioElement) this.audioElement.play();
            else this.synth.resume();
            if (btn) btn.innerHTML = '<span style="margin-right:8px;">⏸</span> Pause Audio';
        }
    },

    stop() {
        this.synth.cancel();
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
        }
        this.resetState();
    },

    resetState() {
        this.status = 'stopped';
        const btn = document.getElementById('voice-assistant-btn');
        if (btn) btn.innerHTML = '<span style="margin-right:8px;">🔊</span> Read Analysis';
    }
};

const LanguageManager = {
    current: localStorage.getItem('app_lang') || 'en',

    // UI strings for static elements
    translations: {
        en: {
            title: "AI MEDICAL NEXUS",
            subtitle: "Select Your Access Level",
            patient_portal: "PATIENT PORTAL",
            patient_p: "Access your 3D health dashboard and AI diagnostics.",
            doctor_terminal: "DOCTOR TERMINAL",
            doctor_p: "Advanced anatomical analysis and patient data.",
            back: "← Back",
            patient_verification: "PATIENT VERIFICATION",
            name: "Name *",
            gender: "Gender *",
            male: "Male",
            female: "Female",
            age: "Age *",
            bp: "Blood Pressure",
            sugar: "Sugar Level",
            hr: "Heart Rate (bpm)",
            init_dashboard: "INITIALIZE DASHBOARD",
            logout: "Logout",
            ai_insights: "AI HEALTH INSIGHTS",
            analyzing_vitals: "Analyzing vitals...",
            analyze: "Analyze",
            cancel: "Cancel",
            pain_assessment: "Pain Assessment",
            intensity: "Pain Intensity",
            intensity_low: "Low",
            intensity_normal: "Normal",
            intensity_high: "High",
            duration: "Pain Duration (days)",
            activity: "Activity when pain started",
            swelling: "Swelling?",
            yes: "Yes",
            no: "No",
            injury: "Previous Injury?",
            other_symptoms: "Other symptoms",
            analyzing: "AI Analysis in progress...",
            read_analysis: "Read Analysis",
            close_analysis: "Close Analysis",
            send_to_doctor: "SEND TO DOCTOR VERIFICATION",
            pending: "Pending...",
            doctor_verified: "Doctor Verified ✅",
            typesOfPain: "Types of Pain",
            possibleDiseases: "Possible Diseases",
            causesOfProblem: "Causes of Problem",
            riskLevel: "Risk Level",
            homeRemedies: "Home Remedies",
            foodDeficiencyGuidance: "Food Deficiency Guidance",
            medicinesGuidance: "Medicines Guidance",
            doctorConsultation: "Doctor Consultation",
            preventionTips: "Prevention Tips",
            emergencyWarningSigns: "Emergency Warning Signs"
        },
        te: {
            title: "AI మెడికల్ నెక్సస్",
            subtitle: "మీ ప్రాప్యత స్థాయిని ఎంచుకోండి",
            patient_portal: "పేషెంట్ పోర్టల్",
            patient_p: "మీ 3D ఆరోగ్య డాష్‌బోర్డ్ మరియు AI నిర్ధారణలను ప్రాప్తి చేయండి.",
            doctor_terminal: "డాక్టర్ టెర్మినల్",
            doctor_p: "అధునాతన అనాటమీ విశ్లేషణ మరియు రోగి డేటా.",
            back: "← వెనుకకు",
            patient_verification: "రోగి ధృవీకరణ",
            name: "పేరు *",
            gender: "లింగం *",
            male: "పురుషుడు",
            female: "స్త్రీ",
            age: "వయస్సు *",
            bp: "రక్తపోటు",
            sugar: "చక్కెర స్థాయి",
            hr: "హృదయ స్పందన రేటు (bpm)",
            init_dashboard: "డాష్‌బోర్డ్ ప్రారంభించండి",
            logout: "లాగ్ అవుట్",
            ai_insights: "AI ఆరోగ్య అంతర్దృష్టులు",
            analyzing_vitals: "వైటల్స్ విశ్లేషిస్తోంది...",
            analyze: "విశ్లేషించండి",
            cancel: "రద్దు చేయి",
            pain_assessment: "నొప్పి అంచనా",
            intensity: "నొప్పి తీవ్రత",
            intensity_low: "తక్కువ",
            intensity_normal: "సాధారణం",
            intensity_high: "ఎక్కువ",
            duration: "నొప్పి వ్యవధి (రోజులు)",
            activity: "నొప్పి మొదలైనప్పుడు చేసిన పని",
            swelling: "వాపు ఉందా?",
            yes: "అవును",
            no: "లేదు",
            injury: "మునుపటి గాయం?",
            other_symptoms: "ఇతర లక్షణాలు",
            analyzing: "AI విశ్లేషణ జరుగుతోంది...",
            read_analysis: "విశ్లేషణ చదవండి",
            close_analysis: "విశ్లేషణ ముగించు",
            send_to_doctor: "డాక్టర్ వెరిఫికేషన్ కోసం పంపండి",
            pending: "వేచి ఉంది...",
            doctor_verified: "డాక్టర్ ధృవీకరించారు ✅",
            typesOfPain: "నొప్పి రకాలు",
            possibleDiseases: "సాధ్యమయ్యే వ్యాధులు",
            causesOfProblem: "సమస్య యొక్క కారణాలు",
            riskLevel: "ప్రమాద స్థాయి",
            homeRemedies: "ఇంటి నివారణలు",
            foodDeficiencyGuidance: "ఆహార లోపం మార్గదర్శకత్వం",
            medicinesGuidance: "మందుల మార్గదర్శకత్వం",
            doctorConsultation: "డాక్టర్ సంప్రదింపులు",
            preventionTips: "నివారణ చిట్కాలు",
            emergencyWarningSigns: "అత్యవసర హెచ్చరిక సంకేతాలు"
        }
    },

    setLanguage(lang) {
        this.current = lang;
        localStorage.setItem('app_lang', lang);
        app.state.language = lang;

        // Update Toggle Buttons
        document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`lang-${lang}`);
        if (activeBtn) activeBtn.classList.add('active');

        this.applyTranslations();

        // Update 3D labels if functions exist
        if (typeof updatePatient3DLabels === 'function') updatePatient3DLabels(lang);
        if (typeof updateDoctor3DLabels === 'function') updateDoctor3DLabels(lang);
    },

    applyTranslations() {
        const dict = this.translations[this.current];

        // Map elements to their translation keys
        const mapping = {
            '#role-selection h1': dict.title,
            '#role-selection .subtitle': dict.subtitle,
            '#role-selection .role-card:nth-child(1) h2': dict.patient_portal,
            '#role-selection .role-card:nth-child(1) p': dict.patient_p,
            '#role-selection .role-card:nth-child(2) h2': dict.doctor_terminal,
            '#role-selection .role-card:nth-child(2) p': dict.doctor_p,
            '#patient-login .back-btn': dict.back,
            '#patient-login h2': dict.patient_verification,
            '#patient-login-form .form-group:nth-child(1) label': dict.name,
            '#patient-login-form .col:nth-child(1) label': dict.gender,
            '#patient-login-form #patient-gender option[value="Male"]': dict.male,
            '#patient-login-form #patient-gender option[value="Female"]': dict.female,
            '#patient-login-form .col:nth-child(2) label': dict.age,
            '#patient-login-form .form-group.row:nth-child(3) .col:nth-child(1) label': dict.bp,
            '#patient-login-form .form-group.row:nth-child(3) .col:nth-child(2) label': dict.sugar,
            '#patient-login-form .form-group.row:nth-child(4) .col:nth-child(1) label': dict.hr,
            '#patient-login-form button': dict.init_dashboard,
            '#patient-anatomy .logout-btn': dict.logout,
            '#health-suggestions-panel h3': dict.ai_insights,
            '#health-loading p': dict.analyzing_vitals,
            '#pain-modal-title': dict.pain_assessment,
            '#pain-form .form-group:nth-child(2) label': dict.intensity,
            '#pain-intensity option[value="Low"]': dict.intensity_low,
            '#pain-intensity option[value="Normal"]': dict.intensity_normal,
            '#pain-intensity option[value="High"]': dict.intensity_high,
            '#pain-form .form-group:nth-child(3) label': dict.duration,
            '#pain-form .form-group:nth-child(4) label': dict.activity,
            '#pain-form .form-group:nth-child(5) label': dict.swelling,
            '#pain-form .form-group:nth-child(6) label': dict.injury,
            '#pain-swelling option[value="No"]': dict.no,
            '#pain-swelling option[value="Yes"]': dict.yes,
            '#pain-injury option[value="No"]': dict.no,
            '#pain-injury option[value="Yes"]': dict.yes,
            '#pain-form .form-group:nth-child(7) label': dict.other_symptoms,
            '#pain-form .btn-cancel': dict.cancel,
            '#pain-form .cyber-btn': dict.analyze,
            '#patient-loading p': dict.analyzing,
            '#doctor-anatomy .logout-btn': dict.logout
        };

        for (const [selector, text] of Object.entries(mapping)) {
            const el = document.querySelector(selector);
            if (el) el.innerText = text;
        }
    }
};

const app = {
    state: {
        patient: {},
        doctor: {},
        currentPart: '',
        currentCaseId: null,
        currentAnalysisRaw: null,
        pollInterval: null,
        doctorPollInterval: null,
        currentDoctorReqId: null,
        language: LanguageManager.current
    },

    init: () => {
        LanguageManager.setLanguage(LanguageManager.current);
    },

    setLanguage: (lang) => {
        LanguageManager.setLanguage(lang);
    },


    showView: (viewId) => {
        document.querySelectorAll('.view').forEach(v => {
            v.classList.remove('active');
            v.classList.add('hidden');
        });

        const targetView = document.getElementById(viewId);
        targetView.classList.remove('hidden');

        // Wait for next frame to apply active class for transition
        requestAnimationFrame(() => {
            targetView.classList.add('active');
        });

        // Show language toggle only on login pages, hide on post-login pages
        const langToggle = document.querySelector('.language-toggle-container');
        if (langToggle) {
            const loginViews = ['role-selection', 'patient-login', 'doctor-login'];
            langToggle.style.display = loginViews.includes(viewId) ? '' : 'none';
        }

        // Initialize 3D contexts if necessary
        if (viewId === 'patient-anatomy') {
            initPatient3D();
        } else if (viewId === 'doctor-anatomy') {
            initDoctor3D();
            // app.fetchDoctorRequests();
        } else {
            // Clean up or pause render loops
            if (window.patientRenderer) window.patientControls.enabled = false;
            if (window.doctorRenderer) window.doctorControls.enabled = false;
        }

        // Stop Voice Assistant if navigating away
        VoiceAssistant.stop();
    },

    handlePatientLogin: (e) => {
        e.preventDefault();
        app.state.patient = {
            name: document.getElementById('patient-name').value,
            gender: document.getElementById('patient-gender').value,
            age: document.getElementById('patient-age').value,
            bp: document.getElementById('patient-bp').value,
            sugar: document.getElementById('patient-sugar').value,
            hr: document.getElementById('patient-hr').value
        };

        // Update UI
        document.getElementById('display-p-name').innerText = app.state.patient.name;
        document.getElementById('display-p-age').innerText = `${app.state.patient.age} yrs`;
        document.getElementById('display-p-gender').innerText = app.state.patient.gender;

        const hrBadge = document.getElementById('display-p-hr');
        if (app.state.patient.hr && app.state.patient.hr.trim() !== '') {
            hrBadge.innerText = `HR: ${app.state.patient.hr} bpm`;
            const hrVal = parseInt(app.state.patient.hr, 10);
            if (!isNaN(hrVal)) {
                if (hrVal < 60 || hrVal > 100) hrBadge.style.color = 'var(--warning)';
                else hrBadge.style.color = 'var(--success)';
            } else {
                hrBadge.style.removeProperty('color');
            }
        } else {
            hrBadge.innerText = `HR: --`;
            hrBadge.style.removeProperty('color');
        }

        const bpBadge = document.getElementById('display-p-bp');
        if (app.state.patient.bp && app.state.patient.bp.trim() !== '') {
            bpBadge.innerText = `BP: ${app.state.patient.bp}`;
            const bpParts = app.state.patient.bp.split('/');
            if (bpParts.length === 2) {
                const sys = parseInt(bpParts[0], 10);
                const dia = parseInt(bpParts[1], 10);
                if (!isNaN(sys) && !isNaN(dia)) {
                    if (sys < 90 || dia < 60) bpBadge.style.color = 'var(--warning)';
                    else if (sys > 120 || dia > 80) bpBadge.style.color = 'var(--danger)';
                    else bpBadge.style.color = 'var(--success)';
                } else {
                    bpBadge.style.removeProperty('color');
                }
            } else {
                bpBadge.style.removeProperty('color');
            }
        } else {
            bpBadge.innerText = `BP: --`;
            bpBadge.style.removeProperty('color');
        }

        const sugarBadge = document.getElementById('display-p-sugar');
        if (app.state.patient.sugar && app.state.patient.sugar.trim() !== '') {
            sugarBadge.innerText = `Sugar: ${app.state.patient.sugar}`;
            const sugarVal = parseInt(app.state.patient.sugar, 10);
            if (!isNaN(sugarVal)) {
                if (sugarVal < 70) sugarBadge.style.color = 'var(--warning)';
                else if (sugarVal > 140) sugarBadge.style.color = 'var(--danger)';
                else sugarBadge.style.color = 'var(--success)';
            } else {
                sugarBadge.style.removeProperty('color');
            }
        } else {
            sugarBadge.innerText = `Sugar: --`;
            sugarBadge.style.removeProperty('color');
        }

        app.showView('patient-anatomy');
        app.fetchHealthSuggestions();
    },

    handleMedConnectLogin: async (e) => {
        e.preventDefault();
        const name = document.getElementById('mc-name').value;
        const password = document.getElementById('mc-password').value;
        const specialty = document.getElementById('mc-specialty').value;
        const errorEl = document.getElementById('mc-error');
        errorEl.innerText = '';

        try {
            // Try login first
            let res = await fetch('/api/medconnect/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, password })
            });

            if (res.status === 401 || res.status === 404) {
                // If fails, try register (auto-register policy)
                res = await fetch('/api/medconnect/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, password, specialty })
                });
            }

            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('mc_token', data.token);
                localStorage.setItem('mc_user', JSON.stringify({ id: data.id, name: data.name, specialty: data.specialty }));
                window.location.href = '/medconnect/';
            } else {
                errorEl.innerText = data.message || 'Login failed.';
            }
        } catch (err) {
            console.error('MedConnect login error:', err);
            errorEl.innerText = 'Server error. Please try again.';
        }
    },

    handleDoctorLogin: (e) => {
        e.preventDefault();
        const email = document.getElementById('doctor-email').value;
        const pass = document.getElementById('doctor-password').value;

        if (email !== 'aidoctor@gmail.com' || pass !== '123456789') {
            document.getElementById('doctor-error').innerText = 'Access Denied: Invalid Credentials';
            return;
        }

        app.state.doctor = {
            name: document.getElementById('doctor-name').value,
            theme: document.getElementById('doctor-theme').value
        };

        document.getElementById('display-d-name').innerText = app.state.doctor.name;
        document.getElementById('display-d-theme').innerText = app.state.doctor.theme;

        if (app.state.doctor.theme === 'Nervous System') {
            document.getElementById('ns-left-panel').classList.remove('hidden');
        } else {
            document.getElementById('ns-left-panel').classList.add('hidden');
        }

        app.showView('doctor-anatomy');
    },

    openDoctorRequestModal: (req) => {
        app.state.currentDoctorReqId = req.id;
        document.getElementById('req-patient-name').innerText = req.patient.name;
        document.getElementById('req-case-id').innerText = req.id;
        document.getElementById('req-part-name').innerText = req.bodyPart;

        let jsonStr = req.analysisRaw;

        // Handle object vs string safely
        if (typeof req.analysisRaw === 'object') {
            jsonStr = JSON.stringify(req.analysisRaw, null, 2);
        } else if (typeof req.analysisRaw === 'string') {
            try {
                // Remove markdown fences if present
                let cleanStr = req.analysisRaw.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(cleanStr);
                jsonStr = JSON.stringify(parsed, null, 2);
            } catch (e) {
                // Fallback to match if possible
                try {
                    const match = req.analysisRaw.match(/\{[\s\S]*\}/);
                    if (match) {
                        const parsed = JSON.parse(match[0]);
                        jsonStr = JSON.stringify(parsed, null, 2);
                    }
                } catch (e2) { }
            }
        }

        document.getElementById('req-json-editor').value = jsonStr;

        // Show X-Ray image if available
        const existingXray = document.getElementById('req-xray-preview');
        if (existingXray) existingXray.remove();
        if (req.xrayUrl) {
            const xraySection = document.createElement('div');
            xraySection.id = 'req-xray-preview';
            xraySection.style.cssText = 'margin-bottom: 16px; padding: 12px; border: 1px solid var(--neon-blue); border-radius: 4px; background: rgba(0,243,255,0.05);';
            xraySection.innerHTML = `
                <label style="color: var(--neon-blue); font-family: Orbitron; font-size: 12px; letter-spacing: 1px; display: block; margin-bottom: 8px;">🩻 PATIENT X-RAY</label>
                <img src="/uploads/${req.xrayUrl}" alt="Patient X-Ray" style="max-width: 100%; max-height: 300px; border-radius: 4px; border: 1px solid var(--neon-blue); display: block; cursor: pointer;" onclick="window.open(this.src,'_blank')" title="Click to open full size">
            `;
            const jsonEditorGroup = document.getElementById('req-json-editor').closest('.form-group');
            if (jsonEditorGroup) {
                jsonEditorGroup.parentNode.insertBefore(xraySection, jsonEditorGroup);
            }
        }

        document.getElementById('doctor-request-modal').classList.remove('hidden');
    },

    closeDoctorRequestModal: () => {
        document.getElementById('doctor-request-modal').classList.add('hidden');
        app.state.currentDoctorReqId = null;
    },

    approveDoctorRequest: async (status) => {
        if (!app.state.currentDoctorReqId) return;
        const modifiedAnalysis = document.getElementById('req-json-editor').value;
        try {
            // Verify it is still valid JSON if modified
            if (status === 'modified') JSON.parse(modifiedAnalysis);
        } catch (e) {
            alert("Invalid JSON format. Please fix editing errors before approving.");
            return;
        }

        try {
            await fetch('/api/doctor-approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: app.state.currentDoctorReqId,
                    status: status,
                    modifiedAnalysis: modifiedAnalysis
                })
            });
            app.closeDoctorRequestModal();
            app.fetchDoctorRequests();
        } catch (e) {
            console.error('Failed to approve request:', e);
            alert('Failed to approve request.');
        }
    },

    fetchDoctorRequests: async () => {
        // Disabled
    },

    renderDoctorRequests: (requests) => {
        // Disabled
    },

    fetchHealthSuggestions: async () => {
        const panel = document.getElementById('health-suggestions-panel');
        const list = document.getElementById('health-suggestions-list');
        const loading = document.getElementById('health-loading');

        panel.classList.remove('hidden');
        list.innerHTML = '';
        loading.classList.remove('hidden');

        try {
            const res = await fetch('/api/health-suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(app.state.patient)
            });

            if (!res.ok) {
                throw new Error(`Server returned ${res.status}: Ensure you have restarted the Node.js server!`);
            }

            const data = await res.json();
            loading.classList.add('hidden');

            let suggestions = [];

            // Handle different possible formats from the backend
            if (Array.isArray(data.result)) {
                suggestions = data.result;
            } else if (typeof data.result === 'string') {
                try {
                    // Try to find JSON array in the string
                    const jsonMatch = data.result.match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                        suggestions = JSON.parse(jsonMatch[0]);
                    } else {
                        // Fallback to line-by-line split if no JSON array found
                        suggestions = data.result.split('\n').filter(s => s.trim().length > 5);
                    }
                } catch (e) {
                    console.warn("Retrying string split fallback...", e);
                    suggestions = data.result.split('\n').filter(s => s.trim().length > 5);
                }
            } else if (data.result && typeof data.result === 'object') {
                // If it's an object but not an array, maybe it's { suggestions: [...] } or similar
                suggestions = data.result.suggestions || Object.values(data.result).filter(v => typeof v === 'string');
            }

            if (!Array.isArray(suggestions) || suggestions.length === 0) {
                throw new Error("No valid suggestions found in response");
            }

            // Render up to 5 items to UI
            suggestions.slice(0, 5).forEach((text, index) => {
                if (typeof text !== 'string') return;
                const li = document.createElement('li');
                // Strip numbers/bullets/quotes from beginning if AI included them incorrectly
                li.innerText = text.replace(/^[-\d.*"']+\s*/, '').replace(/["]+$/, '').trim();
                li.style.animationDelay = `${index * 0.15}s`;
                list.appendChild(li);
            });

        } catch (err) {
            console.error('Failed to load health suggestions:', err);
            loading.classList.add('hidden');
            list.innerHTML = '<li style="color: var(--danger)">Unable to load insights at this time. Please try logging in again later.</li>';
        }
    },

    openPainModal: (partName, localizedName = null) => {
        // Use the human-readable part name for state (used in stream detection)
        const displayName = localizedName || partName;
        app.state.currentPart = displayName;
        document.getElementById('pain-part-name').innerText = displayName.toUpperCase();
        document.getElementById('pain-part-id').value = partName;
        document.getElementById('patient-results').classList.add('hidden');
        document.getElementById('patient-results').innerHTML = '';
        document.getElementById('pain-form').style.display = 'block';
        document.getElementById('pain-modal').classList.remove('hidden');
    },

    closePainModal: () => {
        VoiceAssistant.stop();
        document.getElementById('pain-modal').classList.add('hidden');
    },

    submitPatientAnalysis: async (e) => {
        e.preventDefault();
        VoiceAssistant.stop();

        let imageProcessedText = "";
        const imageInput = document.getElementById('pain-image');
        const xrayInput = document.getElementById('pain-xray');
        app.state.currentImageFile = null;
        app.state.currentXrayFile = null;

        if (xrayInput && xrayInput.files.length > 0) {
            app.state.currentXrayFile = xrayInput.files[0];
        }

        if (imageInput && imageInput.files.length > 0) {
            const file = imageInput.files[0];
            app.state.currentImageFile = file;
            try {
                // Show TF.js loading status
                const loadingText = document.querySelector('#patient-loading p');
                const origLoadingText = loadingText ? loadingText.innerText : 'Processing...';
                if (loadingText) loadingText.innerText = 'Analyzing image locally with TensorFlow.js...';
                document.getElementById('pain-form').style.display = 'none';
                document.getElementById('patient-loading').classList.remove('hidden');

                // Read image for TF.js
                const imgElement = document.createElement('img');
                const imgUrl = URL.createObjectURL(file);
                imgElement.src = imgUrl;

                await new Promise((resolve) => { imgElement.onload = resolve; });
                
                // Load MobileNet and classify
                const model = await mobilenet.load();
                const predictions = await model.classify(imgElement);
                
                // Extract labels
                if (predictions && predictions.length > 0) {
                    const topLabels = predictions.map(p => p.className).join(', ');
                    imageProcessedText = ` [Detected symptoms based on uploaded image: possible ${topLabels}.]`;
                }

                if (loadingText) loadingText.innerText = origLoadingText;
                URL.revokeObjectURL(imgUrl);
            } catch (err) {
                console.error("TensorFlow.js classification error:", err);
            }
        }

        const payload = {
            meshName: app.state.currentPart,
            anatomicalRegion: app.state.currentPart,
            painLevel: document.getElementById('pain-intensity').value,
            painType: 'Somatic', // Default type for physical pain
            duration: document.getElementById('pain-duration').value + ' days',
            notes: `Patient: ${app.state.patient.name}, Age: ${app.state.patient.age}, Activity: ${document.getElementById('pain-activity').value}, Symptoms: ${document.getElementById('pain-symptoms').value}${imageProcessedText}`,
            patientName: app.state.patient.name,
            patientAge: app.state.patient.age,
            painLocation: app.state.currentPart,
            severity: document.getElementById('pain-intensity').value,
            additionalSymptoms: `Swelling: ${document.getElementById('pain-swelling').value}, Previous Injury: ${document.getElementById('pain-injury').value}`,
            aiAnalysis: app.state.currentAnalysisEnglish || app.state.currentAnalysisRaw,
            language: app.state.language
        };

        document.getElementById('pain-form').style.display = 'none';
        document.getElementById('patient-loading').classList.remove('hidden');

        try {
            const res = await fetch('/api/analyze-patient', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            document.getElementById('patient-loading').classList.add('hidden');

            if (!data.result) {
                throw new Error("Server returned success but missing 'result' field.");
            }

            // Store the original analysis
            app.state.currentAnalysisRaw = data.result;
            console.log("Original analysis stored in state.");

            let analysisToDisplay, analysisToStore;

            // Handle the case where the server returns a parsed object or a dual-language wrapper
            const resData = data.result;
            if (resData && resData.english && resData.localized) {
                analysisToDisplay = resData.localized;
                analysisToStore = resData.english;
            } else if (resData && resData.english) {
                analysisToDisplay = resData.english;
                analysisToStore = resData.english;
            } else if (resData && resData.localized) {
                analysisToDisplay = resData.localized;
                analysisToStore = resData.localized;
            } else {
                analysisToDisplay = resData || "Analysis unavailable.";
                analysisToStore = resData || "Analysis unavailable.";
            }

            app.state.currentAnalysisEnglish = analysisToStore;
            app.renderPatientResults(analysisToDisplay);



        } catch (err) {
            console.error(err);
            document.getElementById('patient-loading').classList.add('hidden');
            document.getElementById('pain-form').style.display = 'block';
            alert('Analysis failed. Check console.');
        }
    },

    renderPatientResults: (resultObj) => {
        let parsed = {};
        if (typeof resultObj === 'object' && resultObj !== null) {
            // Already an object, but check if it's the dual-language wrapper
            parsed = resultObj.localized || resultObj.english || resultObj;
        } else if (typeof resultObj === 'string') {
            try {
                const jsonMatch = resultObj.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const temp = JSON.parse(jsonMatch[0]);
                    parsed = temp.localized || temp.english || temp;
                } else {
                    parsed = { raw: resultObj };
                }
            } catch (e) {
                console.log("Failed to parse JSON, showing raw format");
                parsed = { raw: resultObj };
            }
        }

        const container = document.getElementById('patient-results');
        document.getElementById('patient-loading').classList.add('hidden'); // Guarantee loading is hidden
        container.classList.remove('hidden');
        container.innerHTML = '';

        if (parsed.raw || typeof parsed === 'string') {
            const rawContent = parsed.raw || parsed;
            container.innerHTML = `<div class="result-card"><p>${rawContent.replace(/\n/g, '<br>')}</p></div>`;
            return;
        }

        const createCard = (title, content, extraClass = '') => {
            if (!content || (Array.isArray(content) && content.length === 0)) return '';
            let inner = '';
            if (Array.isArray(content)) {
                inner = `<ul>${content.map(c => `<li>${c}</li>`).join('')}</ul>`;
            } else {
                inner = `<p>${content}</p>`;
            }
            return `<div class="result-card ${extraClass}"><h4>${title}</h4>${inner}</div>`;
        };

        const getVal = (obj, keys) => {
            for (let k of keys) {
                if (obj[k] !== undefined) return obj[k];
            }
            return null;
        };

        const dict = LanguageManager.translations[LanguageManager.current];
        const riskVal = (parsed.riskLevel || parsed.risk_level || 'Low').trim();
        const riskClass = `risk-${riskVal.includes('/') ? 'Low' : riskVal}`;

        console.log("Rendering results with parsed object:", parsed);

        let cardsHtml = '';
        cardsHtml += createCard(dict.typesOfPain || 'Types of Pain', getVal(parsed, ['typesOfPain', 'types_of_pain', 'pain_types', 'నొప్పి రకాలు']));
        cardsHtml += createCard(dict.possibleDiseases || 'Possible Diseases', getVal(parsed, ['possibleDiseases', 'possible_diseases', 'సాధ్యమయ్యే వ్యాధులు']));
        cardsHtml += createCard(dict.causesOfProblem || 'Causes of Problem', getVal(parsed, ['causesOfProblem', 'causes_of_problem', 'causes', 'సమస్య కారణాలు']));
        cardsHtml += createCard(dict.riskLevel || 'Risk Level', getVal(parsed, ['riskLevel', 'risk_level', 'ప్రమాద స్థాయి']), riskClass);
        cardsHtml += createCard(dict.homeRemedies || 'Home Remedies', getVal(parsed, ['homeRemedies', 'home_remedies', 'ఇంటి నివారణలు']));
        cardsHtml += createCard(dict.foodDeficiencyGuidance || 'Food Deficiency Guidance', getVal(parsed, ['foodGuidance', 'food_deficiency_guidance', 'ఆహార మార్గదర్శకత్వం']));
        cardsHtml += createCard(dict.medicinesGuidance || 'Medicines Guidance', getVal(parsed, ['medicineGuidance', 'medicines_guidance', 'మందుల మార్గదర్శకత్వం']));
        cardsHtml += createCard(dict.doctorConsultation || 'Doctor Consultation', getVal(parsed, ['doctorConsultation', 'doctor_consultation', 'డాక్టర్ సంప్రదింపులు']));
        cardsHtml += createCard(dict.preventionTips || 'Prevention Tips', getVal(parsed, ['preventionTips', 'prevention_tips', 'నివారణ చిట్కాలు']));
        cardsHtml += createCard(dict.emergencyWarningSigns || 'Emergency Warning Signs', getVal(parsed, ['emergencyWarningSigns', 'emergency_warning_signs', 'అత్యవసర హెచ్చరికలు']), 'border-red');

        if (cardsHtml === '') {
            // Fallback: show everything as raw if nothing matched
            console.warn("No specific keys matched, showing raw JSON content.");
            cardsHtml = `<div class="result-card"><p>${JSON.stringify(parsed, null, 2).replace(/\n/g, '<br>')}</p></div>`;
        }

        container.innerHTML = cardsHtml;

        // Store parsed data for download
        app.state.currentParsedResults = parsed;

        container.innerHTML += `
            <div class="modal-center-actions">
                <button id="send-doc-btn" class="cyber-btn" onclick="app.sendToDoctor()" style="background: rgba(255, 165, 0, 0.2); border-color: orange; width: 100%;">
                    ${dict.send_to_doctor}
                </button>
            </div>
            <div class="flex-center-gap" style="margin-top: 10px; margin-bottom: 10px;">
                <button class="cyber-btn" onclick="app.downloadReport()" style="background: rgba(0, 255, 170, 0.1); border-color: var(--success); width: 100%; font-size: 14px; padding: 12px;">
                    📥 Download Report
                </button>
            </div>
            <div class="modal-actions flex-center-gap">
                <button id="voice-assistant-btn" class="cyber-btn" onclick="VoiceAssistant.toggle()" style="background: rgba(0, 150, 255, 0.2); border-color: #0096ff;">
                    <span style="margin-right:8px;">🔊</span> ${dict.read_analysis}
                </button>
                <button class="cyber-btn" onclick="app.closePainModal()">${dict.close_analysis}</button>
            </div>
        `;

        VoiceAssistant.init('patient-results');
    },

    downloadReport: () => {
        const parsed = app.state.currentParsedResults || {};
        const patient = app.state.patient || {};
        const bodyPart = app.state.currentPart || 'N/A';
        const date = new Date().toLocaleString();

        const getVal = (obj, keys) => {
            for (let k of keys) {
                if (obj[k] !== undefined) return obj[k];
            }
            return null;
        };

        // Initialize jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - margin * 2;
        let y = 0;

        // Color Palette
        const colors = {
            headerBg: [10, 25, 47],        // Dark navy
            headerAccent: [0, 200, 255],    // Cyan
            sectionTitle: [0, 230, 180],    // Teal green
            sectionBg: [15, 30, 55],        // Darker navy
            text: [220, 230, 240],          // Light gray
            white: [255, 255, 255],
            accent: [0, 180, 255],          // Blue accent
            danger: [255, 70, 70],          // Red for emergency
            warning: [255, 180, 50],        // Orange/amber
            success: [0, 220, 130],         // Green
            muted: [140, 160, 180],         // Muted gray
            cardBg: [18, 40, 70],           // Card background
            divider: [0, 150, 200],         // Cyan divider
        };

        // Helper: Check if we need a new page
        const checkPageBreak = (neededHeight) => {
            if (y + neededHeight > pageHeight - 20) {
                doc.addPage();
                // Add subtle page background
                doc.setFillColor(...colors.headerBg);
                doc.rect(0, 0, pageWidth, pageHeight, 'F');
                y = 15;
                return true;
            }
            return false;
        };

        // ====== PAGE BACKGROUND ======
        doc.setFillColor(...colors.headerBg);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        // ====== HEADER SECTION ======
        // Header gradient band
        doc.setFillColor(5, 15, 35);
        doc.rect(0, 0, pageWidth, 52, 'F');

        // Top accent line
        doc.setFillColor(...colors.headerAccent);
        doc.rect(0, 0, pageWidth, 2, 'F');

        // Hospital/Platform Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(...colors.headerAccent);
        doc.text('AI MEDICAL NEXUS', pageWidth / 2, 18, { align: 'center' });

        // Subtitle
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(...colors.muted);
        doc.text('Patient Health Analysis Report', pageWidth / 2, 26, { align: 'center' });

        // Date line
        doc.setFontSize(9);
        doc.setTextColor(...colors.muted);
        doc.text(`Generated: ${date}`, pageWidth / 2, 33, { align: 'center' });

        // Decorative line under header
        doc.setDrawColor(...colors.headerAccent);
        doc.setLineWidth(0.8);
        doc.line(margin, 38, pageWidth - margin, 38);

        // ====== PATIENT INFO SECTION ======
        y = 44;

        // Patient info card background
        doc.setFillColor(12, 32, 58);
        doc.roundedRect(margin, y, contentWidth, 30, 3, 3, 'F');

        // Left accent bar
        doc.setFillColor(...colors.accent);
        doc.rect(margin, y, 3, 30, 'F');

        // Patient info title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...colors.accent);
        doc.text('PATIENT INFORMATION', margin + 8, y + 8);

        // Patient details
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const infoY = y + 15;

        // Column 1
        doc.setTextColor(...colors.muted);
        doc.text('Name:', margin + 8, infoY);
        doc.setTextColor(...colors.white);
        doc.text(patient.name || 'N/A', margin + 28, infoY);

        doc.setTextColor(...colors.muted);
        doc.text('Age:', margin + 8, infoY + 7);
        doc.setTextColor(...colors.white);
        doc.text(String(patient.age || 'N/A'), margin + 28, infoY + 7);

        // Column 2
        doc.setTextColor(...colors.muted);
        doc.text('Body Part:', margin + 80, infoY);
        doc.setTextColor(...colors.white);
        doc.text(bodyPart, margin + 105, infoY);

        doc.setTextColor(...colors.muted);
        doc.text('Gender:', margin + 80, infoY + 7);
        doc.setTextColor(...colors.white);
        doc.text(patient.gender || 'N/A', margin + 105, infoY + 7);

        y = y + 36;

        // ====== SECTION RENDERER ======
        const sections = [
            { title: 'TYPES OF PAIN', keys: ['typesOfPain', 'types_of_pain', 'pain_types', 'నొప్పి రకాలు'], color: colors.accent },
            { title: 'POSSIBLE DISEASES', keys: ['possibleDiseases', 'possible_diseases', 'సాధ్యమయ్యే వ్యాధులు'], color: [180, 120, 255] },
            { title: 'CAUSES OF PROBLEM', keys: ['causesOfProblem', 'causes_of_problem', 'causes', 'సమస్య కారణాలు'], color: [255, 180, 80] },
            { title: 'RISK LEVEL', keys: ['riskLevel', 'risk_level', 'ప్రమాద స్థాయి'], color: colors.warning, isRisk: true },
            { title: 'HOME REMEDIES', keys: ['homeRemedies', 'home_remedies', 'ఇంటి నివారణలు'], color: colors.success },
            { title: 'FOOD DEFICIENCY GUIDANCE', keys: ['foodGuidance', 'food_deficiency_guidance', 'ఆహార మార్గదర్శకత్వం'], color: [100, 220, 180] },
            { title: 'MEDICINES GUIDANCE', keys: ['medicineGuidance', 'medicines_guidance', 'మందుల మార్గదర్శకత్వం'], color: [120, 180, 255] },
            { title: 'DOCTOR CONSULTATION', keys: ['doctorConsultation', 'doctor_consultation', 'డాక్టర్ సంప్రదింపులు'], color: [0, 200, 200] },
            { title: 'PREVENTION TIPS', keys: ['preventionTips', 'prevention_tips', 'నివారణ చిట్కాలు'], color: [100, 255, 180] },
            { title: 'EMERGENCY WARNING SIGNS', keys: ['emergencyWarningSigns', 'emergency_warning_signs', 'అత్యవసర హెచ్చరికలు'], color: colors.danger, isDanger: true },
        ];

        sections.forEach((section) => {
            const value = getVal(parsed, section.keys);
            if (!value) return;

            const items = Array.isArray(value) ? value : [String(value)];

            // Calculate needed height
            let sectionHeight = 14; // title + padding
            items.forEach((item) => {
                const lines = doc.splitTextToSize(String(item), contentWidth - 20);
                sectionHeight += lines.length * 5 + 3;
            });
            sectionHeight += 4; // bottom padding

            checkPageBreak(sectionHeight + 6);

            // Section card background
            if (section.isDanger) {
                doc.setFillColor(40, 12, 12);
            } else if (section.isRisk) {
                doc.setFillColor(35, 28, 10);
            } else {
                doc.setFillColor(...colors.cardBg);
            }
            doc.roundedRect(margin, y, contentWidth, sectionHeight, 2, 2, 'F');

            // Left color accent bar
            doc.setFillColor(...section.color);
            doc.rect(margin, y, 3, sectionHeight, 'F');

            // Section title
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(...section.color);
            doc.text(section.title, margin + 8, y + 8);

            // Thin line under title
            doc.setDrawColor(...section.color);
            doc.setLineWidth(0.3);
            doc.line(margin + 8, y + 10, margin + contentWidth - 8, y + 10);

            // Items
            let itemY = y + 16;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(...colors.text);

            items.forEach((item, idx) => {
                const text = String(item).replace(/^[-\d.*"']+\s*/, '').trim();
                const lines = doc.splitTextToSize(text, contentWidth - 24);

                // Bullet point
                doc.setFillColor(...section.color);
                doc.circle(margin + 10, itemY - 1.2, 1, 'F');

                lines.forEach((line, lineIdx) => {
                    const xOffset = lineIdx === 0 ? margin + 14 : margin + 14;
                    doc.text(line, xOffset, itemY);
                    itemY += 5;
                });
                itemY += 1;
            });

            y += sectionHeight + 5;
        });

        // ====== FOOTER ======
        checkPageBreak(20);

        // Footer divider
        doc.setDrawColor(...colors.divider);
        doc.setLineWidth(0.5);
        doc.line(margin, y + 2, pageWidth - margin, y + 2);

        // Footer text
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(...colors.muted);
        doc.text('This report is AI-generated and should be verified by a medical professional.', pageWidth / 2, y + 8, { align: 'center' });
        doc.text('AI Medical Nexus — Confidential Patient Report', pageWidth / 2, y + 13, { align: 'center' });

        // Bottom accent line on each page
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFillColor(...colors.headerAccent);
            doc.rect(0, pageHeight - 2, pageWidth, 2, 'F');
            // Page number
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...colors.muted);
            doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
        }

        // Save the PDF
        doc.save(`Health_Report_${(patient.name || 'Patient').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
    },

    sendToDoctor: async () => {
        const dict = LanguageManager.translations[LanguageManager.current];
        const btn = document.getElementById('send-doc-btn');
        if (btn) {
            btn.innerText = dict.pending;
            btn.disabled = true;
            btn.style.opacity = '0.7';
            // Instantly change color to indicate pending state
            btn.style.background = 'rgba(255, 255, 0, 0.2)';
            btn.style.borderColor = 'yellow';
            btn.style.color = 'yellow';
        }
        try {
            // CRITICAL: Always use the English version for doctor verification
            let parsed = app.state.currentAnalysisEnglish;

            if (!parsed) {
                // Fallback if somehow English is missing, but prioritize it
                if (typeof app.state.currentAnalysisRaw === 'object' && app.state.currentAnalysisRaw !== null) {
                    parsed = app.state.currentAnalysisRaw;
                } else if (app.state.currentAnalysisRaw) {
                    try {
                        const jsonStr = app.state.currentAnalysisRaw.match(/\{[\s\S]*\}/)[0];
                        parsed = JSON.parse(jsonStr);
                    } catch (e) {
                        console.log("Failed to parse JSON for saving to DB");
                    }
                }
            }

            // Comprehensive stream detection based on body part label names
            let stream = 'General';
            const ORTHOPEDIC_PARTS = [
                'knee', 'shoulder', 'bone', 'ankle', 'wrist', 'spine', 'elbow',
                'hip', 'hips', 'thigh', 'shin', 'calf', 'heel', 'foot', 'feet',
                'forearm', 'palm', 'finger', 'toes', 'instep', 'sole', 'waist',
                'sacrum', 'buttock', 'shoulder blade', 'collarbone', 'upper arm',
                'back knee', 'back thigh', 'lower back', 'middle back', 'upper back',
                // Telugu keywords
                'మోకాలు', 'భుజం', 'ఎముక', 'మణికట్టు', 'వెన్నెముక', 'మోచేయి',
                'నడుము', 'కాలు', 'చేయి', 'పాదరసం', 'కీలు', 'ఎముకలు'
            ];
            const NEUROLOGY_PARTS = [
                'brain', 'head', 'nerve', 'forehead', 'eyes', 'nose', 'ears',
                'mouth', 'chin', 'cheeks', 'occipital', 'nape', 'back of head',
                // Telugu keywords
                'మెదడు', 'తల', 'నరం', 'నరాలు', 'కన్ను', 'కళ్లు', 'చెవి', 'ముక్కు', 'నోరు'
            ];
            const CARDIOLOGY_PARTS = [
                'heart', 'vein', 'chest', 'nipple', 'collarbone area',
                // Telugu keywords
                'గుండె', 'ఛాతీ', 'రక్తం', 'రక్తనాళం'
            ];

            const part = (app.state.currentPart || '').toLowerCase();
            if (ORTHOPEDIC_PARTS.some(k => part.includes(k))) {
                stream = 'Orthopedic';
            } else if (NEUROLOGY_PARTS.some(k => part.includes(k))) {
                stream = 'Neurology';
            } else if (CARDIOLOGY_PARTS.some(k => part.includes(k))) {
                stream = 'Cardiology';
            } else {
                // Fallback: try to infer from AI analysis content if body part is unrecognized
                const analysisStr = JSON.stringify(parsed).toLowerCase();
                if (ORTHOPEDIC_PARTS.some(k => analysisStr.includes(k))) stream = 'Orthopedic';
                else if (NEUROLOGY_PARTS.some(k => analysisStr.includes(k))) stream = 'Neurology';
                else if (CARDIOLOGY_PARTS.some(k => analysisStr.includes(k))) stream = 'Cardiology';
                else stream = 'General';
            }
            console.log(`[Doctor Portal] Body part: "${app.state.currentPart}" → Stream: ${stream}`);

            const intensity = document.getElementById('pain-intensity')?.value || 'Normal';
            let severityNum = 2;
            if (intensity === 'Normal') severityNum = 5;
            if (intensity === 'High') severityNum = 8;

            const duration = document.getElementById('pain-duration')?.value || '0';
            const activity = document.getElementById('pain-activity')?.value || 'None';
            const swelling = document.getElementById('pain-swelling')?.value || 'None';
            const injury = document.getElementById('pain-injury')?.value || 'None';
            const symptoms = document.getElementById('pain-symptoms')?.value || 'None';

            const casePayload = {
                meshName: app.state.currentPart,
                anatomicalRegion: app.state.currentPart,
                painLevel: severityNum,
                painType: 'Patient Analysis Report',
                duration: duration + ' days',
                notes: `Patient: ${app.state.patient?.name}. Activity: ${activity}. Swelling: ${swelling}. Prev Injury: ${injury}. Other: ${symptoms}`,
                aiAnalysis: typeof parsed === 'object' ? JSON.stringify(parsed) : (parsed || ''),
                riskLevel: (parsed && parsed.riskLevel) || 'Low',
                suggestedStream: stream,
                patientName: app.state.patient?.name || 'Anonymous',
                patientAge: String(app.state.patient?.age || 'N/A'),
                language: app.state.language || 'en'
            };

            const caseForm = new FormData();
            Object.entries(casePayload).forEach(([k, v]) => caseForm.append(k, v));
            if (app.state.currentImageFile) {
                caseForm.append('image', app.state.currentImageFile);
            }
            if (app.state.currentXrayFile) {
                caseForm.append('xray', app.state.currentXrayFile);
            }

            const res = await fetch('/api/create-case', {
                method: 'POST',
                body: caseForm  // Note: no Content-Type header needed for FormData
            });

            const data = await res.json();
            if (data && data.data && (data.data._id || data.data.id)) {
                app.state.currentCaseId = data.data._id || data.data.id;
            } else {
                console.warn('create-case response missing data._id:', data);
                app.state.currentCaseId = null;
            }

            if (app.state.currentCaseId) {
                app.state.pollInterval = setInterval(app.pollDoctorStatus, 3000);
            }
        } catch (e) {
            console.error(e);
            if (btn) {
                btn.innerText = 'SEND TO DOCTOR VERIFICATION';
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.background = 'rgba(255, 165, 0, 0.2)';
                btn.style.borderColor = 'orange';
                btn.style.color = '';
            }
        }
    },

    pollDoctorStatus: async () => {
        if (!app.state.currentCaseId) return;
        try {
            const res = await fetch('/api/patient-status/' + app.state.currentCaseId);
            const data = await res.json();

            if (data.status === 'agreed' || data.status === 'modified') {
                console.log(`Doctor ${data.status} with analysis`);
                clearInterval(app.state.pollInterval);

                // Render the results/diff with whatever data the doctor provided
                app.renderPatientResultsDiff(
                    app.state.currentAnalysisRaw,
                    data.modifiedAnalysis || app.state.currentAnalysisRaw,
                    {
                        aiAccuracy: data.aiAccuracy,
                        doctorCorrection: data.doctorCorrection
                    }
                );

                const dict = LanguageManager.translations[LanguageManager.current];
                const btn = document.getElementById('send-doc-btn');
                if (btn) {
                    btn.innerText = dict.doctor_verified;
                    btn.style.background = 'rgba(0, 255, 0, 0.4)';
                    btn.style.borderColor = '#00ff00';
                    btn.style.color = '#ffffff';
                }
            } else if (data.status === 'rejected') {
                clearInterval(app.state.pollInterval);
                const btn = document.getElementById('send-doc-btn');
                if (btn) {
                    btn.innerText = 'Analysis Rejected ❌';
                    btn.style.background = 'rgba(255, 0, 0, 0.3)';
                    btn.style.borderColor = 'red';
                }
                alert("The doctor has rejected this analysis request.");
            }
        } catch (e) {
            console.error("Polling error:", e);
        }
    },

    renderPatientResultsDiff: (originalStr, modifiedStr, metrics = {}) => {
        console.log("Rendering result diff...");
        let origObj = {}, modObj = {};

        // Parse original (usually a string from Gemini)
        try {
            if (typeof originalStr === 'object' && originalStr !== null) {
                origObj = originalStr;
            } else if (typeof originalStr === 'string') {
                let cleanStr = originalStr.replace(/```json/g, '').replace(/```/g, '').trim();
                const match = cleanStr.match(/\{[\s\S]*\}/);
                origObj = JSON.parse(match ? match[0] : cleanStr);
            }
        } catch (e) {
            console.warn("Could not parse original analysis for diff", e);
            origObj = { raw: originalStr };
        }

        // Parse modified (usually an object from MongoDB)
        try {
            if (typeof modifiedStr === 'object' && modifiedStr !== null) {
                modObj = modifiedStr;
            } else if (typeof modifiedStr === 'string') {
                let cleanStr = modifiedStr.replace(/```json/g, '').replace(/```/g, '').trim();
                const match = cleanStr.match(/\{[\s\S]*\}/);
                modObj = JSON.parse(match ? match[0] : cleanStr);
            }
            // CRITICAL FIX: Extract nested translated objects
            if (modObj.aiAnalysis) {
                modObj = modObj.aiAnalysis.localized || modObj.aiAnalysis.english || modObj.aiAnalysis;
            } else if (modObj.localized) {
                modObj = modObj.localized;
            } else if (modObj.english) {
                modObj = modObj.english;
            }
        } catch (e) {
            console.warn("Could not parse modified analysis for diff", e);
            modObj = { raw: modifiedStr };
        }

        const container = document.getElementById('patient-results');
        if (!container) return;

        container.classList.remove('hidden');
        container.innerHTML = '<h3 style="text-align:center; color: var(--success); text-shadow: 0 0 10px var(--success); margin-bottom:15px; font-family:Orbitron;">DOCTOR VERIFIED INSIGHTS</h3>';

        // Store parsed data for download
        app.state.currentParsedResults = modObj;

        if (modObj.doctorNotes) {
            container.innerHTML += `
                <div class="result-card" style="border-left: 4px solid var(--neon-blue); background: rgba(0, 243, 255, 0.05);">
                    <h4 style="color: var(--neon-blue)">Doctor's Clinical Note</h4>
                    <p style="font-style: italic;">"${modObj.doctorNotes}"</p>
                </div>
            `;
        }

        const getDiffHTML = (oldText, newText) => {
            if (!oldText) oldText = '';
            if (!newText) newText = '';
            if (typeof oldText !== 'string') oldText = JSON.stringify(oldText);
            if (typeof newText !== 'string') newText = JSON.stringify(newText);

            if (!window.Diff) return newText; // Fallback if jsdiff not loaded

            const diff = window.Diff.diffWords(oldText, newText);
            let html = '';
            diff.forEach(part => {
                if (part.added) {
                    html += `<ins class="diff-added">${part.value}</ins>`;
                } else if (part.removed) {
                    html += `<del class="diff-removed">${part.value}</del>`;
                } else {
                    html += part.value;
                }
            });
            return html;
        };

        const getVal = (obj, keys) => {
            for (let k of keys) {
                if (obj[k] !== undefined) return obj[k];
            }
            return null;
        };

        const createDiffCard = (title, keys, extraClass = '') => {
            let oldVal = getVal(origObj, keys);
            let newVal = getVal(modObj, keys);

            if (!oldVal && !newVal) return '';

            if (Array.isArray(oldVal)) oldVal = oldVal.join(', ');
            if (Array.isArray(newVal)) newVal = newVal.join(', ');

            const htmlContent = getDiffHTML(oldVal || '', newVal || '');
            return `<div class="result-card ${extraClass}"><h4>${title}</h4><p>${htmlContent}</p></div>`;
        };

        const processedKeys = new Set();
        const mainKeys = [
            { title: 'Types of Pain', keys: ['typesOfPain', 'TypesOfPain', 'types_of_pain', 'Types of Pain'] },
            { title: 'Possible Diseases', keys: ['possibleDiseases', 'PossibleDiseases', 'possible_diseases', 'Possible Diseases'] },
            { title: 'Causes of Problem', keys: ['causesOfProblem', 'CausesOfProblem', 'causes_of_problem', 'Causes of Problem', 'causes', 'Causes'] },
            { title: 'Risk Level', keys: ['riskLevel', 'RiskLevel', 'risk_level', 'Risk Level'], special: 'risk' },
            { title: 'Home Remedies', keys: ['homeRemedies', 'HomeRemedies', 'home_remedies', 'Home Remedies'] },
            { title: 'Food Deficiency Guidance', keys: ['foodDeficiencyGuidance', 'FoodDeficiencyGuidance', 'food_deficiency_guidance', 'Food Deficiency Guidance', 'foodGuidance'] },
            { title: 'Medicines Guidance', keys: ['medicinesGuidance', 'MedicinesGuidance', 'medicines_guidance', 'Medicines Guidance', 'medicineGuidance'] },
            { title: 'Doctor Consultation', keys: ['doctorConsultation', 'DoctorConsultation', 'doctor_consultation', 'Doctor Consultation'] },
            { title: 'Prevention Tips', keys: ['preventionTips', 'PreventionTips', 'prevention_tips', 'Prevention Tips'] },
            { title: 'Emergency Warning Signs', keys: ['emergencyWarningSigns', 'EmergencyWarningSigns', 'emergency_warning_signs', 'Emergency Warning Signs'], special: 'emergency' }
        ];

        if (origObj.raw && modObj.raw) {
            container.innerHTML += `<div class="result-card"><p>${getDiffHTML(origObj.raw, modObj.raw).replace(/\n/g, '<br>')}</p></div>`;
        } else {
            // Render main keys first
            mainKeys.forEach(m => {
                const card = createDiffCard(m.title, m.keys, m.special === 'risk' ? `risk-${(getVal(modObj, m.keys) || 'Low').trim()}` : (m.special === 'emergency' ? 'border-red' : ''));
                if (card) {
                    container.innerHTML += card;
                    m.keys.forEach(k => processedKeys.add(k));
                }
            });

            // Catch any extra keys the doctor might have added or that we missed
            Object.keys(modObj).forEach(k => {
                if (!processedKeys.has(k) && k !== 'doctorNotes' && k !== 'raw') {
                    let newVal = modObj[k];
                    let oldVal = getVal(origObj, [k]);

                    if (Array.isArray(newVal)) newVal = newVal.join(', ');
                    if (Array.isArray(oldVal)) oldVal = oldVal.join(', ');

                    container.innerHTML += `<div class="result-card"><h4>${k.charAt(0).toUpperCase() + k.slice(1)}</h4><p>${getDiffHTML(oldVal || '', newVal || '')}</p></div>`;
                }
            });
        }

        const accuracy = metrics.aiAccuracy ?? 0;
        const correction = metrics.doctorCorrection ?? 0;

        container.innerHTML += `
            <div class="modal-center-actions">
                <button id="send-doc-btn" class="cyber-btn btn-doctor-agreed" disabled>
                    Doctor Agreed & Modified ✅
                </button>
            </div>
            <div class="flex-center-gap" style="margin-top: 10px; margin-bottom: 10px;">
                <button class="cyber-btn" onclick="app.downloadReport()" style="background: rgba(0, 255, 170, 0.1); border-color: var(--success); width: 100%; font-size: 14px; padding: 12px;">
                    📥 Download Report
                </button>
            </div>
            <div class="modal-actions flex-center-gap">
                <button id="voice-assistant-btn" class="cyber-btn" onclick="VoiceAssistant.toggle()" style="background: rgba(0, 150, 255, 0.2); border-color: #0096ff;">
                    <span style="margin-right:8px;">🔊</span> Read Analysis
                </button>
                <button class="cyber-btn" onclick="app.closePainModal()">Close Analysis</button>
            </div>
        `;

        VoiceAssistant.init('patient-results');
    },

    openDoctorModal: (partName) => {
        app.state.currentPart = partName;
        document.getElementById('doc-part-name').innerText = partName.toUpperCase();
        document.getElementById('doc-part-id').value = partName;
        document.getElementById('doctor-results').classList.add('hidden');
        document.getElementById('doctor-results').innerHTML = '';
        document.getElementById('doc-form').style.display = 'block';
        document.getElementById('doctor-modal').classList.remove('hidden');
    },

    closeDoctorModal: () => {
        VoiceAssistant.stop();
        document.getElementById('doctor-modal').classList.add('hidden');

        const nsSpeed = document.getElementById('ns-speed');
        if (nsSpeed) nsSpeed.innerText = '110 m/s';

        const nsStatus = document.getElementById('ns-status');
        if (nsStatus) {
            nsStatus.innerText = 'ACTIVE';
            nsStatus.style.color = 'var(--success)';
        }

        const nsResponse = document.getElementById('ns-response');
        if (nsResponse) nsResponse.innerText = '0.12 s';
    },

    submitDoctorAnalysis: async (e) => {
        e.preventDefault();
        VoiceAssistant.stop();

        const formData = new FormData();
        formData.append('theme', app.state.doctor.theme);
        formData.append('partName', app.state.currentPart);
        formData.append('bp', document.getElementById('doc-bp').value);
        formData.append('sugar', document.getElementById('doc-sugar').value);
        formData.append('heartbeat', document.getElementById('doc-heartbeat').value);
        formData.append('bloodlevel', document.getElementById('doc-bloodlevel').value || '');
        formData.append('symptoms', document.getElementById('doc-symptoms').value);
        formData.append('painIntensity', document.getElementById('doc-pain-intensity').value);
        formData.append('painStart', document.getElementById('doc-pain-start').value);

        const fileInput = document.getElementById('doc-scanning-reports');
        if (fileInput && fileInput.files.length > 0) {
            for (let i = 0; i < fileInput.files.length; i++) {
                formData.append('images', fileInput.files[i]);
            }
        }

        document.getElementById('doc-form').style.display = 'none';
        document.getElementById('doctor-loading').classList.remove('hidden');

        try {
            const res = await fetch('http://localhost:3000/api/analyze-doctor', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            document.getElementById('doctor-loading').classList.add('hidden');
            app.renderDoctorResults(data.result);
        } catch (err) {
            console.error(err);
            document.getElementById('doctor-loading').classList.add('hidden');
            document.getElementById('doc-form').style.display = 'block';
            alert('Analysis failed. Check console.');
        }
    },

    renderDoctorResults: (resultString) => {
        let parsed = {};
        if (typeof resultString === 'object' && resultString !== null) {
            parsed = resultString;
        } else {
            try {
                // Remove markdown code block wrapping if present
                let cleanString = resultString.trim();
                if (cleanString.startsWith('```json')) {
                    cleanString = cleanString.substring(7);
                } else if (cleanString.startsWith('```')) {
                    cleanString = cleanString.substring(3);
                }
                if (cleanString.endsWith('```')) {
                    cleanString = cleanString.substring(0, cleanString.length - 3);
                }

                // Try direct parse first
                try {
                    parsed = JSON.parse(cleanString);
                } catch (e1) {
                    // Regex fallback for loose JSON block
                    const jsonMatch = cleanString.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        parsed = JSON.parse(jsonMatch[0]);
                    } else {
                        throw e1;
                    }
                }
            } catch (e) {
                console.log("Failed to parse JSON directly, showing raw format", e);
                parsed = { raw: resultString };
            }
        }

        const container = document.getElementById('doctor-results');
        container.classList.remove('hidden');
        container.innerHTML = '';

        if (parsed.raw) {
            container.innerHTML = `<div class="result-card"><p>${parsed.raw.replace(/\n/g, '<br>')}</p></div>`;
            return;
        }

        const createCard = (title, content) => {
            if (!content) return ''; // Skip empty cards
            let inner = '';
            if (Array.isArray(content)) {
                inner = `<ul>${content.map(c => `<li>${c}</li>`).join('')}</ul>`;
            } else {
                inner = `<p>${content}</p>`;
            }
            return `<div class="result-card"><h4>${title}</h4>${inner}</div>`;
        };

        container.innerHTML += createCard('Anatomy Description', parsed.anatomyDescription);
        container.innerHTML += createCard('Function', parsed.function);
        container.innerHTML += createCard('Common Disorders', parsed.commonDisorders);
        container.innerHTML += createCard('Symptoms', parsed.symptoms);
        container.innerHTML += createCard('Clinical Relevance', parsed.clinicalRelevance);
        container.innerHTML += createCard('Diagnostic Methods', parsed.diagnosticMethods);

        // Append close btn and voice assistant btn
        container.innerHTML += `
            <div class="modal-actions flex-center-gap">
                <button id="voice-assistant-btn" class="cyber-btn" onclick="VoiceAssistant.toggle()" style="background: rgba(0, 150, 255, 0.2); border-color: #0096ff;">
                    <span style="margin-right:8px;">🔊</span> Read Analysis
                </button>
                <button class="cyber-btn" onclick="app.closeDoctorModal()">Close Analysis</button>
            </div>
        `;

        // Initialize voice assistant with the new content
        VoiceAssistant.init('doctor-results');
    }
};

window.onload = () => {
    app.init();
    // Show role selection by default
    app.showView('role-selection');
};
