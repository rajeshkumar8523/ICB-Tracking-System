function togglePassword(fieldId) {
    const passwordField = document.getElementById(fieldId);
    const eyeIcon = passwordField.nextElementSibling;

    if (passwordField.type === "password") {
        passwordField.type = "text";
        eyeIcon.textContent = "🙈";
    } else {
        passwordField.type = "password";
        eyeIcon.textContent = "👁️";
    }
}

function openModal() {
    document.getElementById("forgotPasswordModal").style.display = "flex";
}

function closeModal() {
    document.getElementById("forgotPasswordModal").style.display = "none";
    document.getElementById("reset-error-message").textContent = "";
    document.getElementById("reset-success-message").textContent = "";
    document.getElementById("reset-success-message").style.display = "none";
}

function guestLogin() {
    window.location.href = "../HOME/home.html";
}

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const userId = document.getElementById("userId").value;
    const password = document.getElementById("password").value;
    const errorMessage = document.getElementById("error-message");
    const successMessage = document.getElementById("success-message");

    errorMessage.textContent = "";
    successMessage.textContent = "";
    successMessage.style.display = "none";

    try {
        const response = await fetch('https://icb-trcking-backend.vercel.app/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        successMessage.textContent = "Login successful! Redirecting...";
        successMessage.style.display = "block";
        
        // Store token in localStorage
        localStorage.setItem('token', data.token);
        
        // Redirect to welcome page after 1 second
        setTimeout(() => {
            window.location.href = "../HOME/home.html";
        }, 1000);
    } catch (error) {
        errorMessage.textContent = error.message;
    }
});

document.getElementById('resetPasswordForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const userId = document.getElementById("resetUserId").value;
    const newPassword = document.getElementById("resetNewPassword").value;
    const confirmPassword = document.getElementById("resetConfirmPassword").value;
    const errorMessage = document.getElementById("reset-error-message");
    const successMessage = document.getElementById("reset-success-message");

    errorMessage.textContent = "";
    successMessage.textContent = "";
    successMessage.style.display = "none";

    if (newPassword !== confirmPassword) {
        errorMessage.textContent = "Passwords do not match!";
        return;
    }

    try {
        const response = await fetch('http://192.168.0.245:3000/api/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                newPassword,
                confirmPassword
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Password reset failed');
        }

        successMessage.textContent = "Password reset successfully!";
        successMessage.style.display = "block";
        
        // Clear form and close modal after 2 seconds
        setTimeout(() => {
            document.getElementById("resetPasswordForm").reset();
            closeModal();
        }, 2000);
    } catch (error) {
        errorMessage.textContent = error.message;
    }
});