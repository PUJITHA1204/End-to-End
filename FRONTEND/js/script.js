// ==========================================
// 1. GLOBAL UI & NAVIGATION
// ==========================================
window.showSection = function(sectionId) {
    const sections = ['availableJobsSec', 'appliedJobsSec', 'viewProfileSec', 'profileFormSec'];
    
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            section.classList.add('hidden');
            section.style.display = 'none'; 
        }
    });

    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.remove('hidden');
        target.style.display = 'block';
    }

    // --- ENHANCED UI CLEANUP ---
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(b => b.remove());
    
    document.body.classList.remove('modal-open');
    document.body.style.overflow = 'auto'; 
    document.body.style.backgroundColor = ""; 
    document.body.style.filter = "none";      
    
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.style.display = 'none';
};

// --- LOGOUT FUNCTIONALITY ---
window.logoutStudent = function() {
    // Clear the session
    localStorage.clear(); 
    // Redirect to home/index page
    window.location.replace('../index.html');
};
// Add this to script.js
window.logoutAdmin = function() {
    localStorage.removeItem('adminUser');
    localStorage.removeItem('userId');
    // Clear everything to be safe
    localStorage.clear(); 
    alert("Logged out successfully.");
    window.location.replace('../index.html');
};
window.prepareEditForm = function() {
    if (!window.currentUser) {
        alert("User data is still loading. Please try again in a moment.");
        return;
    }
    const u = window.currentUser;

    // Populating the form fields with current user data
    document.getElementById('stdName').value = u.name || '';
    document.getElementById('stdEmail').value = u.email || '';
    document.getElementById('stdMobile').value = u.phone || u.mobileNumber || '';
    document.getElementById('stdCollege').value = u.collegeName || '';
    document.getElementById('stdBranch').value = u.branch || '';
    document.getElementById('stdCGPA').value = u.cgpa || '';
    
    // Always clear password so the user only changes it if they want to
    const pwdField = document.getElementById('stdPassword');
    if (pwdField) pwdField.value = "";

    // Switch view to the form
    window.showSection('profileFormSec');
};

// ==========================================
// 2. INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('userId');
    const path = window.location.pathname;

    if (path.includes('admin.html')) {
    const adminContainer = document.getElementById('jobData');
    if (adminContainer) {
        await loadJobs(adminContainer);
    }
}

 // Inside your DOMContentLoaded listener in script.js
if (window.location.pathname.includes('postedjobs.html')) {
    const companyId = localStorage.getItem('userId');
    const container = document.getElementById('companyJobData'); 
    
    if (container && companyId) {
        fetch(`https://end-to-end-1110.onrender.com/api/jobs/company-jobs/${companyId}`)
            .then(res => res.json())
            .then(jobs => {
                if (jobs.length === 0) {
                    container.innerHTML = '<tr><td colspan="5" style="text-align:center;">No jobs posted yet.</td></tr>';
                } else {
                    container.innerHTML = jobs.map(job => `
                        <tr>
                            <td><strong>${job.jobRole}</strong></td>
                            <td>${job.package || 'N/A'}</td>
                            <td>${new Date(job.examDate).toLocaleDateString()}</td>
                            <td><span class="badge" style="cursor:pointer; background:#3b82f6; color:white; padding:5px 10px; border-radius:15px;" onclick="viewApplicants('${job._id}')">${job.applicants ? job.applicants.length : 0} Applied</span></td>
                            <td>
                                <button class="btn" style="background:#ef4444; color:white; border:none; padding:5px 10px; cursor:pointer;" 
                                    onclick="deleteJob('${job._id}')">Delete Post</button>
                            </td>
                        </tr>
                    `).join('');
                }
            });
    }
}
    if (userId && (path.includes('student.html') || path.includes('studenthandler.html'))) {
        await initDashboard(userId);
    }

    const jobForm = document.getElementById('jobForm');
    if (jobForm) setupJobPosting(jobForm);
    setupProfileUpdate();
});

// ==========================================
// 3. CORE LOGIC
// ==========================================
async function initDashboard(userId) {
    try {
        const res = await fetch(`https://end-to-end-1110.onrender.com/api/auth/profile/${userId}`);
        const user = await res.json();
        window.currentUser = user; 
        
        renderProfileCard(user);

        if (!user.branch || !user.cgpa) {
            window.showSection('profileFormSec');
        } else {
            window.showSection('availableJobsSec');
            await loadJobs(document.getElementById('availableJobs'));
            await loadAppliedJobs();
        }
    } catch (err) { console.error("Dashboard Init Error:", err); }
}

// Separate function to render the profile so it can be called after updates
function renderProfileCard(user) {
    const greeting = document.getElementById('userGreeting');
    if (greeting) greeting.innerHTML = `Hello, ${user.name}!`;

    const profileDetailsContainer = document.getElementById('viewProfileSec'); 
    if (profileDetailsContainer) {
        profileDetailsContainer.innerHTML = `
            <h3>Profile Details</h3>
            <div class="profile-card">
                <p><strong>Name:</strong> ${user.name || 'N/A'}</p>
                <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
                <p><strong>Phone:</strong> ${user.mobileNumber || user.phone || 'Not Provided'}</p> 
                <p><strong>College:</strong> ${user.collegeName || 'Not Provided'}</p>
                <p><strong>Branch:</strong> ${user.branch || 'Not Provided'}</p>
                <p><strong>CGPA:</strong> ${user.cgpa || 'Not Provided'}</p>
                <p><strong>Resume:</strong> <a href="https://end-to-end-1110.onrender.com/${user.resumePath}" target="_blank" class="resume-link">📄 View Current Resume</a></p>
                <hr>
                <button class="btn" onclick="prepareEditForm()">Edit All Details / Change Password</button>
            </div>
        `;
    }
}

async function loadJobs(container) {
    if (!container) return;
    try {
        // Fetch all jobs from the server
        const response = await fetch('https://end-to-end-1110.onrender.com/api/jobs/all'); 
        const jobs = await response.json();
        
        container.innerHTML = jobs.map(job => {
            // MATCHING LOGIC: Uses the length of the applicants array
            const appliedCount = (job.applicants && Array.isArray(job.applicants)) ? job.applicants.length : 0;

            if (container.id === 'availableJobs') {
                // Deadline check
                const isExpired = new Date() > new Date(job.examDate);
                const buttonHTML = isExpired ? 
                    `<button class="btn" disabled style="background:#9ca3af; cursor:not-allowed;">Deadline Passed</button>` : 
                    `<button class="btn" onclick="handleApply(event, '${job._id}')">Apply</button>`;

                // STUDENT VIEW: Shows company, role, and Apply button
                return `<tr>
                    <td>${job.companyName}</td>
                    <td>${job.jobRole}</td>
                    <td>${job.package}</td>
                    <td>${buttonHTML}</td>
                </tr>`;
            } else {
                // ADMIN VIEW: Shows role, date, and the UPDATED COUNT
                return `<tr>
                    <td>${job.companyName}</td>
                    <td>${job.jobRole}</td>
                    <td>${new Date(job.examDate).toLocaleDateString()}</td>
                    <td>
                        <span class="badge" style="background:#3b82f6; color:white; padding:5px 10px; border-radius:15px; cursor:pointer;" onclick="viewApplicants('${job._id}')">
                            ${appliedCount} Applied
                        </span>
                    </td> 
                </tr>`;
            }
        }).join('');
    } catch (err) { 
        console.error("Admin Load Error:", err); 
        container.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Error loading job data.</td></tr>';
    }
}
// ==========================================
// 3. CORE LOGIC (Updated Apply Function)
// ==========================================

window.handleApply = async function(event, jobId) {
    // Note: event is passed first, then jobId
    const btn = event.target;
    const userId = localStorage.getItem('userId');
    const user = window.currentUser;

    if (!userId || !user) {
        alert("Session expired or user data not loaded. Please login again.");
        window.location.href = 'studenthandler.html';
        return;
    }

    // Check if resume exists before allowing application
    if (!user.resumePath) {
        alert("❌ Please upload your resume in the Profile section before applying.");
        window.showSection('profileFormSec');
        return;
    }

    // Confirm with the user
    if (!confirm("Are you sure you want to apply for this position?")) return;

    // UI Feedback: Disable button and show processing
    const originalText = btn.innerText;
    btn.innerText = "Processing...";
    btn.disabled = true;

    try {
        const res = await fetch('https://end-to-end-1110.onrender.com/api/jobs/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userId: userId, 
                jobId: jobId, 
                cgpa: user.cgpa, // Using the live CGPA from your profile
                name: user.name,
                email: user.email
            })
        });

        const data = await res.json();
        
        if (res.ok) {
            alert("✅ Success: " + data.message);
            // Refresh the lists to show the new application status
            await loadAppliedJobs(); 
            const availableJobsContainer = document.getElementById('availableJobs');
            if (availableJobsContainer) await loadJobs(availableJobsContainer);
        } else {
            alert("❌ " + data.message);
        }
    } catch (err) { 
        console.error("Apply Error:", err);
        alert("Network error. Please check your connection.");
    } finally {
        // Reset button state
        btn.innerText = originalText;
        btn.disabled = false;
    }
};
async function loadAppliedJobs() {
    const userId = localStorage.getItem('userId');
    const container = document.getElementById('appliedList');
    if (!container || !userId) return;
    try {
        const res = await fetch(`https://end-to-end-1110.onrender.com/api/jobs/applied/${userId}`);
        const apps = await res.json();
        if (apps.length === 0) {
            container.innerHTML = '<tr><td colspan="3">You haven\'t applied to any jobs yet.</td></tr>';
            return;
        }
        container.innerHTML = apps.map(app => `
            <tr>
                <td>${app.jobId ? app.jobId.companyName : '<span style="color:red">Job No Longer Exists</span>'}</td>
                <td>${app.jobId ? app.jobId.jobRole : 'N/A'}</td>
                <td><span class="status-badge ${app.status.toLowerCase()}">${app.status || 'Applied'}</span></td>
            </tr>
        `).join('');
    } catch (err) { console.error("Error loading applied jobs:", err); }
}

function setupProfileUpdate() {
    const profileForm = document.getElementById('profileForm');
    if (!profileForm) return;

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = localStorage.getItem('userId');
        
        // FormData automatically packages text AND the resume file
        const formData = new FormData(profileForm);

        try {
            const response = await fetch(`https://end-to-end-1110.onrender.com/api/auth/update-profile/${userId}`, {
                method: 'POST',
                body: formData // CRITICAL: No headers! Let the browser set them for files.
            });

            const result = await response.json();

            if (response.ok) {
                alert("✅ Profile & Resume updated!");
                
                // 1. Update the global data so 'Apply' button sees new info
                window.currentUser = result.user; 
                
                // 2. Refresh the visual profile card
                renderProfileCard(result.user); 
                
                // 3. Go back to the view screen
                window.showSection('viewProfileSec');
            } else {
                alert("❌ Update failed: " + result.message);
            }
        } catch (err) {
            console.error("Update Error:", err);
            alert("Connection error. Is the server running?");
        }
    });
}
// Inside script.js
function setupJobPosting(jobForm) {
    if (jobForm.dataset.initialized) return;
    jobForm.dataset.initialized = "true";

    jobForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Get the company/admin ID more reliably
        // We check 'userId' first (common for companies) then fallback to 'adminUser' object
        const userId = localStorage.getItem('userId');
        const adminData = JSON.parse(localStorage.getItem('adminUser'));
        const finalId = userId || (adminData ? adminData.userId : null);
        
        if (!finalId) {
            alert("❌ Session expired. Please login again.");
            // Redirect to the appropriate login page
            window.location.href = "login.html"; 
            return;
        }

        const jobData = {
            companyName: document.getElementById('companyName').value,
            jobRole: document.getElementById('jobRole').value,
            minCGPA: parseFloat(document.getElementById('minCGPA').value) || 0,
            examDate: document.getElementById('examDate').value,
            package: document.getElementById('package').value,
            // Split by comma and remove empty strings/whitespace
            keywords: document.getElementById('keywords').value.split(',')
                        .map(k => k.trim())
                        .filter(k => k !== ""),
            postedBy: finalId 
        };

        try {
            const response = await fetch('https://end-to-end-1110.onrender.com/api/jobs/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jobData)
            });

            const result = await response.json();

            if (response.ok) {
                alert('✅ Job posted successfully!');
                jobForm.reset();
                
                // 2. Navigation: If a company posted this, send them to their list
                if (window.location.pathname.includes('company')) {
                    window.location.href = "postedjobs.html";
                } else {
                    // Otherwise, refresh the table if it's an admin view
                    const adminTable = document.getElementById('jobData');
                    if (adminTable) await loadJobs(adminTable);
                }
            } else {
                alert("❌ Server Error: " + (result.message || "Invalid Data"));
            }
        } catch (error) {
            console.error("Connection Error:", error);
            alert("❌ Network Error: Is the server running?");
        }
    });
}
// GLOBAL DELETE FUNCTION - Place this at the bottom of js/script.js
window.deleteJob = async function(jobId) {
    if (!confirm("Are you sure? This will delete the job and all student applications.")) return;
    
    try {
        const res = await fetch(`https://end-to-end-1110.onrender.com/api/jobs/${jobId}`, { 
            method: 'DELETE' 
        });

        if (res.ok) {
            alert("✅ Job deleted successfully");
            location.reload(); // Refresh to update the UI
        } else {
            const errData = await res.json();
            alert("❌ Delete failed: " + (errData.message || "Unknown error"));
        }
    } catch (err) {
        console.error("Delete Error:", err);
        alert("Network error. Could not connect to server.");
    }
};

// ==========================================
// 4. APPLICANT DETAILS MODAL LOGIC
// ==========================================
window.viewApplicants = async function(jobId) {
    try {
        const response = await fetch(`https://end-to-end-1110.onrender.com/api/jobs/applicants/${jobId}`);
        const applications = await response.json();

        // Build HTML for the table rows
        let rowsHtml = '';
        if (applications.length === 0) {
            rowsHtml = '<tr><td colspan="7" style="text-align: center;">No applicants yet.</td></tr>';
        } else {
            rowsHtml = applications.map(app => {
                const s = app.studentId;
                if (!s) return ''; // If student was deleted
                return `
                    <tr>
                        <td>${s.name || 'N/A'}</td>
                        <td>${s.collegeName || 'N/A'}</td>
                        <td>${s.branch || 'N/A'}</td>
                        <td>${s.cgpa || 'N/A'}</td>
                        <td>${s.email || 'N/A'}</td>
                        <td>
                            ${s.resumePath 
    ? `<a href="https://end-to-end-1110.onrender.com/${s.resumePath}" target="_blank">View Resume</a>` 
    : 'No Resume'}
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // Create Modal Overlay
        const overlay = document.createElement('div');
        overlay.classList.add('modal-backdrop');
        overlay.style.position = 'fixed';
        overlay.style.top = '0'; overlay.style.left = '0';
        overlay.style.width = '100%'; overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.6)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '1000';

        // Modal Content Box
        const modal = document.createElement('div');
        modal.style.background = '#fff';
        modal.style.padding = '30px';
        modal.style.borderRadius = '12px';
        modal.style.width = '90%';
        modal.style.maxWidth = '900px';
        modal.style.maxHeight = '80vh';
        modal.style.overflowY = 'auto';
        modal.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
        
        modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #1e3a8a;">Applicant Details</h2>
                <button onclick="this.closest('.modal-backdrop').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280;">&times;</button>
            </div>
            <table class="data-table" style="width: 100%; border-collapse: collapse;">
                <thead style="background: #f1f5f9;">
                    <tr>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Name</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">College</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Branch</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">CGPA</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Email</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Resume</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        `;

        overlay.appendChild(modal);
        // Allow click outside modal to close
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); }
        
        document.body.appendChild(overlay);

    } catch (err) {
        console.error("Error showing applicants:", err);
        alert("Failed to load applicants.");
    }
};