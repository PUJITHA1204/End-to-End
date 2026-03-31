const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Job = require('../models/job');
const User = require('../models/user');
const Application = require('../models/application'); 
const fs = require('fs');
const path = require('path');
const PDFParser = require("pdf2json"); 

// --- 1. GET ALL JOBS ---
// --- 1. GET ALL JOBS (Fixed for Admin Applied Count) ---
router.get(['/', '/all'], async (req, res) => {
    try {
        const jobs = await Job.find().sort({ createdAt: -1 });

        // Map through jobs and attach application counts
        const jobsWithCounts = await Promise.all(jobs.map(async (job) => {
            const applicants = await Application.find({ jobId: job._id });
            
            return {
                ...job._doc,
                // We provide the length so the Admin frontend can read job.applicants.length
                applicants: applicants 
            };
        }));

        res.json(jobsWithCounts || []); 
    } catch (err) {
        console.error("Admin Jobs Fetch Error:", err);
        res.status(500).json({ message: err.message });
    }
});

// --- 2. GET APPLIED JOBS FOR A STUDENT ---
router.get('/applied/:userId', async (req, res) => {
    try {
        const apps = await Application.find({ studentId: req.params.userId }).populate('jobId');
        res.json(apps);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- 3. POST A NEW JOB ---
router.post('/create', async (req, res) => { 
    try {
        const jobData = {
            ...req.body,
            postedBy: mongoose.Types.ObjectId.isValid(req.body.postedBy) 
                ? new mongoose.Types.ObjectId(req.body.postedBy) 
                : null
        };
        const newJob = new Job(jobData); 
        await newJob.save();
        res.status(201).json({ message: "Job Posted Successfully!" });
    } catch (err) {
        res.status(500).json({ message: "Posting Error: " + err.message });
    }
});

// --- 4. APPLY FOR A JOB ---
router.post('/apply', async (req, res) => {
    try {
        const { userId, jobId, cgpa } = req.body; 

        const job = await Job.findById(jobId);
        const user = await User.findById(userId);

        if (!job || !user) return res.status(404).json({ message: "Job or User not found" });

        const alreadyApplied = await Application.findOne({ jobId, studentId: userId });
        if (alreadyApplied) return res.status(400).json({ message: "You have already applied for this job!" });

        if (!user.resumePath) {
            return res.status(400).json({ message: "Please upload your resume in the Profile section first." });
        }
        
        // Ensure path is absolute and correct
        const resumeFullPath = path.isAbsolute(user.resumePath) 
            ? user.resumePath 
            : path.join(__dirname, '..', user.resumePath);

        if (!fs.existsSync(resumeFullPath)) {
            return res.status(400).json({ message: "Resume file not found on server. Please re-upload." });
        }

        const pdfParser = new PDFParser(null, 1);

        // --- CRITICAL FIX: Handle Parser Errors (Prevents button from getting stuck) ---
        pdfParser.on("pdfParser_dataError", errData => {
            console.error("PDF Parser Error:", errData.parserError);
            if (!res.headersSent) res.status(500).json({ message: "Error reading PDF resume." });
        });

        pdfParser.on("pdfParser_dataReady", async () => {
            try {
                const resumeText = pdfParser.getRawTextContent().toLowerCase();
                let matchCount = 0;
                
                // Ensure keywords exist and is an array
                const jobKeywords = Array.isArray(job.keywords) ? job.keywords : [];
                
                jobKeywords.forEach(word => {
                    if (word && resumeText.includes(word.toLowerCase().trim())) {
                        matchCount++;
                    }
                });

                const matchPercentage = jobKeywords.length > 0 ? (matchCount / jobKeywords.length) * 100 : 0;
                const formattedPercent = matchPercentage.toFixed(1);

                // Eligibility Logic (Minimum 50% required)
                if (matchPercentage < 50) {
                    return res.status(403).json({ 
                        message: `Rejected: Skill match is ${formattedPercent}%. (Minimum 50% required).`,
                        matchScore: formattedPercent
                    });
                }

                // Success: Save Application
                const newApp = new Application({
                    jobId,
                    studentId: userId,
                    matchScore: formattedPercent,
                    status: 'Applied' 
                });
                await newApp.save();

                return res.status(200).json({ 
                    message: `Application successful! Your skill match is ${formattedPercent}%.`,
                    matchScore: formattedPercent 
                });

            } catch (innerErr) {
                console.error("Inner Processing Error:", innerErr);
                if (!res.headersSent) res.status(500).json({ message: "Processing Error" });
            }
        });

        pdfParser.loadPDF(resumeFullPath);

    } catch (err) {
        console.error("Global Apply Error:", err);
        if (!res.headersSent) res.status(500).json({ message: "Server Error: " + err.message });
    }
});

// --- 5. DELETE A JOB ---
// --- 5. DELETE A JOB ---
// --- DELETE A JOB (In jobroutes.js) ---
router.delete('/:id', async (req, res) => {
    try {
        const jobId = req.params.id;
        // 1. Delete the job
        const deletedJob = await Job.findByIdAndDelete(jobId);
        
        if (!deletedJob) {
            return res.status(404).json({ message: "Job not found" });
        }

        // 2. Delete all applications related to this job
        await Application.deleteMany({ jobId: jobId });

        res.json({ message: "Job deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Server Error: " + err.message });
    }
});
// --- 6. GET JOBS POSTED BY A SPECIFIC COMPANY ---
router.get('/company-jobs/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;

        // Check if the companyId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(companyId)) {
            return res.status(400).json({ message: "Invalid Company ID format" });
        }

        // Find jobs where 'postedBy' matches the logged-in company user
        const jobs = await Job.find({ postedBy: companyId }).sort({ createdAt: -1 });

        // We also need to attach the applicant details to each job
        // To do this, we find all applications for these jobs
        const jobsWithApplicants = await Promise.all(jobs.map(async (job) => {
            const applicants = await Application.find({ jobId: job._id })
                .populate('studentId', 'name email mobileNumber collegeName cgpa branch');
            
            // Return the job object but add an 'applicants' array for the frontend
            return {
                ...job._doc,
                applicants: applicants.map(app => ({
                    userId: app.studentId, // This matches your frontend's 'app.userId' logic
                    cgpa: app.studentId ? app.studentId.cgpa : 'N/A',
                    matchScore: app.matchScore
                }))
            };
        }));

        res.json(jobsWithApplicants);
    } catch (err) {
        console.error("Error fetching company jobs:", err);
        res.status(500).json({ message: "Server Error: " + err.message });
    }
});

// --- 7. GET APPLICANTS FOR A SPECIFIC JOB ---
router.get('/applicants/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ message: "Invalid Job ID" });
        }
        
        const applications = await Application.find({ jobId })
            .populate('studentId', 'name email mobileNumber collegeName branch cgpa resumePath');
        
        res.json(applications);
    } catch (err) {
        console.error("Error fetching applicants:", err);
        res.status(500).json({ message: "Server Error: " + err.message });
    }
});

module.exports = router;