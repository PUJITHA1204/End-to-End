document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('studentSignupForm');
    const loginForm = document.getElementById('studentLoginForm');

    // --- SIGN UP LOGIC ---
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const password = document.getElementById('regPass').value;
            const confirmPassword = document.getElementById('regConfirmPass').value;

            if (password !== confirmPassword) {
                alert("❌ Passwords do not match!");
                return;
            }

            const mobile = document.getElementById('regMobile').value;
            if (!/^\d{10}$/.test(mobile)) {
                alert("❌ Contact number must be exactly 10 digits.");
                return;
            }

            if (!/^(?=.*\d)(?=.*[!@#$%^&*]).{6,}$/.test(password)) {
                alert("❌ Password must be at least 6 characters long, with at least one digit and one special character.");
                return;
            }

            const studentData = {
                name: document.getElementById('regName').value,
                collegeName: document.getElementById('regCollege').value,
                rollNumber: document.getElementById('regRoll').value,
                email: document.getElementById('regEmail').value,
                mobileNumber: document.getElementById('regMobile').value,
                password: password,
                role: 'student'
            };

            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(studentData)
            });

            const result = await response.json();

            if (response.ok) {
                alert("✅ Registration Successful! Please login.");
                // Redirect back to login view within the same page
                location.reload(); 
            } else {
                alert("❌ Error: " + result.message); // Backend will say "User already exists"
            }
        });
    }

    // --- LOGIN LOGIC ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const loginData = {
                collegeName: document.getElementById('logCollege').value,
                rollNumber: document.getElementById('logRoll').value,
                password: document.getElementById('logPass').value
            };

            const response = await fetch('/api/auth/student-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginData)
            });

            const result = await response.json();

            if (response.ok) {
                // Save session info
                localStorage.setItem('userId', result.userId);
                localStorage.setItem('userRole', result.role);
                
                alert("✅ Login Successful!");
                // REDIRECT to student.html (which is in the same folder)
                window.location.href = "student.html"; 
            } else {
                alert("❌ " + result.message);
            }
        });
    }
});