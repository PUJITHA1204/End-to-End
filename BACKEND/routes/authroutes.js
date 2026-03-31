const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- MULTER CONFIGURATION FOR RESUMES ---
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); 
    },
    filename: (req, file, cb) => {
        const safeName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
        cb(null, safeName);
    }
});
const upload = multer({ storage: storage });

// ==========================================
// 1. REGISTRATION & LOGIN ROUTES
// ==========================================

// --- STUDENT REGISTRATION ---
router.post('/register', async (req, res) => {
    try {
        const { name, collegeName, rollNumber, email, mobileNumber, password, role } = req.body;

        const existingUser = await User.findOne({ 
            $or: [
                { email: email },
                { collegeName: collegeName, rollNumber: rollNumber }
            ]
        });

        if (existingUser) {
            return res.status(400).json({ message: "Student already registered with this Email or Roll Number!" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = new User({
            name,
            collegeName,
            rollNumber,
            email,
            mobileNumber,
            password: hashedPassword,
            role: role || 'student'
        });

        await newUser.save();
        res.status(201).json({ message: "Registration Successful!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error: " + err.message });
    }
});

// --- UPDATED UNIFIED LOGIN ROUTE ---
// ==========================================
// 1. ADMIN LOGIN (Dedicated)
// ==========================================
router.post('/admin-login', async (req, res) => {
    try {
        const { collegeId, password } = req.body;

        // Strictly search for Admin role only
        const user = await User.findOne({ collegeId: collegeId, role: 'admin' });

        if (!user) {
            return res.status(404).json({ message: "Admin account not found. Please check your College ID." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Incorrect Admin password." });

        const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({
            token,
            userId: user._id,
            role: user.role,
            name: user.name || user.collegeName,
            message: "Admin Login Successful"
        });
    } catch (err) {
        res.status(500).json({ message: "Admin Login Error: " + err.message });
    }
});

// ==========================================
// 2. STUDENT LOGIN (Dedicated)
// ==========================================
router.post('/student-login', async (req, res) => {
    try {
        // Destructure the fields exactly as sent by your frontend loginData
        const { collegeName, rollNumber, password } = req.body;

        // Search by collegeName, rollNumber, and ensure the role is 'student'
        const user = await User.findOne({ 
            collegeName: collegeName, 
            rollNumber: rollNumber, 
            role: 'student' 
        });

        // If no user matches that specific combination
        if (!user) {
            return res.status(404).json({ 
                message: "Student account not found. Please check your College Name and Roll Number." 
            });
        }

        // Verify the password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Incorrect Student password." });
        }

        // Sign the token
        const token = jwt.sign(
            { userId: user._id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        // Send successful response
        res.json({
            token,
            userId: user._id,
            role: user.role,
            name: user.name,
            message: "Student Login Successful"
        });
    } catch (err) {
        console.error("Student Login Error:", err);
        res.status(500).json({ message: "Student Login Error: " + err.message });
    }
});
// 2. COMPANY ROUTES
// ==========================================

router.post('/company-register', async (req, res) => {
    try {
        const { 
            companyName, companyMail, companyContact, 
            hrName, personId, personMail, personContact, password 
        } = req.body;

        const existingCompany = await User.findOne({ companyName, personId });
        if (existingCompany) {
            return res.status(400).json({ message: "Company with this Person ID is already registered!" });
        }

        const existingEmail = await User.findOne({ email: personMail });
        if (existingEmail) {
            return res.status(400).json({ message: "This Email ID is already in use!" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newCompany = new User({
            role: 'company',
            email: personMail,
            password: hashedPassword,
            companyName,
            companyMail,
            companyContact,
            hrName,
            personId,
            personMail,
            personContact
        });

        await newCompany.save();
        res.status(201).json({ message: "Company Registration Successful! Please Login." });
    } catch (err) {
        res.status(500).json({ message: "Registration Error: " + err.message });
    }
});

router.post('/company-login', async (req, res) => {
    try {
        const { companyName, personId, password } = req.body;
        const user = await User.findOne({ companyName, personId, role: 'company' });

        if (!user) {
            return res.status(401).json({ message: "Invalid Company Name or Person ID" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Incorrect password" });
        }

        res.json({ 
            userId: user._id, 
            role: user.role, 
            name: user.hrName, 
            company: user.companyName 
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ==========================================
// 3. PROFILE MANAGEMENT ROUTES
// ==========================================

router.get('/profile/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/update-profile/:id', upload.single('resume'), async (req, res) => {
    try {
        const { name, branch, cgpa, phone, collegeName, password } = req.body;
        
        const updateData = {
            name,
            branch,
            cgpa: cgpa ? parseFloat(cgpa) : undefined,
            mobileNumber: phone,
            collegeName: collegeName
        };

        if (req.file) {
            updateData.resumePath = 'uploads/' + req.file.filename;
        }

        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        Object.keys(updateData).forEach(key => 
            (updateData[key] === undefined || updateData[key] === "") && delete updateData[key]
        );

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id, 
            { $set: updateData }, 
            { new: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ message: "Profile updated successfully!", user: updatedUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Update failed: " + err.message });
    }
});
// --- ADMIN REGISTRATION (Add this to authroutes.js) ---
// --- ADMIN REGISTRATION ---
router.post('/admin-register', async (req, res) => {
    try {
        const { collegeName, collegeId, password, name, designation, mobileNumber } = req.body;

        // 1. Keep the duplicate check to prevent double registration
        const existingAdmin = await User.findOne({ collegeId: collegeId, role: 'admin' });
        if (existingAdmin) {
            return res.status(400).json({ message: "Admin with this ID already exists!" });
        }

        // 2. Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Create the new Admin with all your form fields
        const newAdmin = new User({
            role: 'admin',
            collegeName,
            collegeId,
            password: hashedPassword,
            name: name,               // Maps to 'Full Name' in your form
            designation: designation, // Maps to 'Designation'
            mobileNumber: mobileNumber // Maps to 'Contact Number'
            // email is omitted because it is no longer required in your updated UserSchema
        });

        // 4. Save to MongoDB
        await newAdmin.save();
        res.status(201).json({ message: "Admin Registered Successfully!" });
        
    } catch (err) {
        console.error("Signup Error:", err);
        res.status(500).json({ message: "Admin Signup Error: " + err.message });
    }
});

module.exports = router;