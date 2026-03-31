const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    // --- COMMON FIELDS ---
    // --- COMMON FIELDS ---
email: { 
    type: String, 
    unique: true, 
    sparse: true, // Crucial: Allows multiple users (Admins) to have NO email
    required: false // Changed from true to false
},
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'company', 'admin'], required: true },
    mobileNumber: String, // Shared field for contact (maps to 'contact' in admin form)

    // --- SHARED ADMIN & STUDENT FIELDS ---
    collegeName: { type: String }, 

    // --- ADMIN SPECIFIC FIELDS (New) ---
    // collegeId and collegeName together will act as the Primary Key for Admins
    collegeId: { type: String, sparse: true }, 
    designation: { type: String }, // Role or Designation in the college

    // --- STUDENT SPECIFIC FIELDS ---
    name: String,
    rollNumber: { type: String, sparse: true }, 
    branch: String,
    cgpa: Number,
    resumePath: String,

    // --- COMPANY SPECIFIC FIELDS ---
    companyName: { type: String, sparse: true },
    companyMail: String,
    companyContact: String,
    hrName: String,          
    personId: { type: String, sparse: true }, 
    personMail: String,
    personContact: String
});

/**
 * DATABASE PRIMARY KEY LOGIC
 * This creates a unique constraint: No two 'admin' users can have the 
 * same College Name + College ID combination.
 */
UserSchema.index(
    { collegeName: 1, collegeId: 1 }, 
    { 
        unique: true, 
        partialFilterExpression: { role: 'admin' } 
    }
);

module.exports = mongoose.model('User', UserSchema);