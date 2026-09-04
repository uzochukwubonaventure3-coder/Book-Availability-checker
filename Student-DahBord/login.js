document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  const togglePassword = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');

  // Toggle password visibility
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function() {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
    });
  }

  // Check if there's saved login info
  const savedEmail = localStorage.getItem('rememberedEmail');
  const savedPassword = localStorage.getItem('rememberedPassword');
  
  if (savedEmail && savedPassword) {
    document.getElementById('email').value = savedEmail;
    passwordInput.value = savedPassword;
    document.getElementById('rememberMe').checked = true;
  }

  // Form submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = passwordInput.value.trim();
    const rememberMe = document.getElementById('rememberMe').checked;
    const messageDiv = document.getElementById('loginMessage');

    // Clear previous message
    messageDiv.textContent = '';
    messageDiv.className = 'message';

    // Basic validation
    if (!email || !password) {
      messageDiv.textContent = 'Please fill in all fields';
      messageDiv.className = 'message error';
      shakeForm();
      return;
    }

    // Show loading state
    const submitBtn = loginForm.querySelector('.submit-btn');
    const originalText = submitBtn.querySelector('.btn-text').textContent;
    submitBtn.querySelector('.btn-text').textContent = 'Signing In...';
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.8';

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.token) {
        // Save JWT
        localStorage.setItem("token", data.token);

        // Save credentials if "Remember me" is checked
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
          localStorage.setItem('rememberedPassword', password);
        } else {
          localStorage.removeItem('rememberedEmail');
          localStorage.removeItem('rememberedPassword');
        }

        // Show success message
        messageDiv.textContent = "✓ Login successful! Redirecting...";
        messageDiv.className = 'message success';
        
        // Add pulse animation
        submitBtn.style.animation = 'pulse 1.5s infinite';

        // Redirect based on role
        setTimeout(() => {
          if (data.role === "admin") {
            window.location.href = "../AdminDashBoard/Admin.html";
          } else {
            window.location.href = "../HomePage/index.html";
          }
        }, 1500);
      } else {
        messageDiv.textContent = data.message || "Invalid email or password";
        messageDiv.className = 'message error';
        shakeForm();
      }
    } catch (error) {
      messageDiv.textContent = "Network error. Please try again.";
      messageDiv.className = 'message error';
      console.error('Login error:', error);
      shakeForm();
    } finally {
      // Reset button state after 2 seconds
      setTimeout(() => {
        submitBtn.querySelector('.btn-text').textContent = originalText;
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.animation = '';
      }, 2000);
    }
  });

  // Forgot password functionality
  const forgotPasswordLink = document.querySelector('.forgot-password');
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      
      if (email) {
        const messageDiv = document.getElementById('loginMessage');
        messageDiv.textContent = `Password reset instructions sent to ${email}`;
        messageDiv.className = 'message info';
        
        // Simulate API call
        setTimeout(() => {
          alert(`Password reset link would be sent to: ${email}\n(Check your email)`);
        }, 300);
      } else {
        const emailInput = document.getElementById('email');
        emailInput.focus();
        const messageDiv = document.getElementById('loginMessage');
        messageDiv.textContent = 'Please enter your email first';
        messageDiv.className = 'message error';
      }
    });
  }

  // Shake animation for form errors
  function shakeForm() {
    const form = document.querySelector('.form');
    form.style.animation = 'none';
    requestAnimationFrame(() => {
      form.style.animation = 'shake 0.5s ease-in-out';
    });
  }
});

// Add shake animation to CSS if not already present
if (!document.querySelector('style[data-shake-animation]')) {
  const style = document.createElement('style');
  style.setAttribute('data-shake-animation', 'true');
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
      20%, 40%, 60%, 80% { transform: translateX(8px); }
    }
    
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
      70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
  `;
  document.head.appendChild(style);
}