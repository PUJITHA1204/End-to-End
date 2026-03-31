const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

const frontendPath = path.join(__dirname, '..', 'FRONTEND');

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Database Connected Successfully"))
  .catch(err => console.log("❌ Database Connection Error:", err));

// --- 4. API ROUTES ---
app.use('/api/auth', require('./routes/authroutes'));
app.use('/api/jobs', require('./routes/jobroutes'));

// --- 5. STATIC ASSETS ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(frontendPath));

// --- 6. PAGE ROUTING ---
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// --- 7. FALLBACK ROUTE ---
app.get(/^(?!\/api).+/, (req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Final Error Handler for API 404s (ONLY ONE INSTANCE)
app.use('/api', (req, res) => {
    res.status(404).json({ message: "API endpoint not found. Check your route paths." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});