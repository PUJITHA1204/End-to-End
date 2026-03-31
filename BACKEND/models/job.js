const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    companyName: String,
    jobRole: String,
    minCGPA: Number,
    examDate: Date,
    package: String,
    keywords: [String],
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    applicants: [{
        studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        email: String,
        cgpa: Number,
        matchScore: Number,
        resume: String
    }]
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema); // IMPORTANT