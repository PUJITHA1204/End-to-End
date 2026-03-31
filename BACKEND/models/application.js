const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, default: 'Applied' }, // Applied, Passed, Failed
    appliedDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Application', ApplicationSchema);