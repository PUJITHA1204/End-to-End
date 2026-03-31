const router = require('express').Router();
const User = require('../models/user'); // Your user.js file
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

router.post('/login', async (req, res) => {
    try {
        const { collegeId, collegeName, password, email } = req.body;
        let user;

        // 1. Logic for ADMIN Login (using collegeId and collegeName)
        if (collegeId && collegeName) {
            user = await User.findOne({ collegeId, collegeName, role: 'admin' });
        } 
        // 2. Logic for STUDENT/COMPANY Login (using email)
        else if (email) {
            user = await User.findOne({ email });
        }

        if (!user) return res.status(404).json({ message: "User not found" });

        // 3. Password Verification
        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(400).json({ message: "Invalid password" });

        // 4. Token Generation (Passing the role so your auth.js middleware works)
        const token = jwt.sign(
            { _id: user._id, role: user.role }, 
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.header('Authorization', token).json({
            token: token,
            userId: user._id,
            name: user.name || user.collegeName,
            message: "Logged in successfully"
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
router.post('/register', async (req, res) => {
    try {
        // Check if user already exists
        const emailExist = await User.findOne({ email: req.body.email });
        if (emailExist) return res.status(400).json({ message: "Email already exists" });

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        // Create user object based on the Schema you provided
        const newUser = new User({
            ...req.body,
            password: hashedPassword
        });

        await newUser.save();
        res.status(201).json({ message: "User registered successfully!", userId: newUser._id });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;