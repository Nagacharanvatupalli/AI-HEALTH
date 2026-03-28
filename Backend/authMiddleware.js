const jwt = require('jsonwebtoken');

const protectDoctorRoute = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-doctor-key-12345');
        req.doctor = decoded; // Contains { doctorId, stream }
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

module.exports = protectDoctorRoute;
