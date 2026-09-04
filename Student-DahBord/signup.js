document.addEventListener('DOMContentLoaded', function() {
  const signupForm = document.getElementById('signupForm');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const togglePassword = document.getElementById('togglePassword');
  const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
  const strengthFill = document.getElementById('strengthFill');
  const strengthText = document.getElementById('strengthText');
  const passwordMatch = document.getElementById('passwordMatch');

  // Toggle password visibility
  [togglePassword, toggleConfirmPassword].forEach((btn, index) => {
    btn?.addEventListener('click', function() {
      const input = index === 0 ? passwordInput : confirmPasswordInput;
      const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
      input.setAttribute('type', type);
      this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
    });
  });

  // Password strength checker
  passwordInput.addEventListener('input', function() {
    const password = this.value;
    let strength = 0;
    let text = 'Very Weak';
    let color = '#ef4444';

    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    switch(strength) {
      case 1:
        text = 'Weak';
        color = '#f97316';
        break;
      case 2:
        text = 'Fair';
        color = '#f59e0b';
        break;
      case 3:
        text = 'Good';
        color = '#84cc16';
        break;
      case 4:
        text = 'Strong';
        color = '#10b981';
        break;
    }

    strengthFill.style.width = `${strength * 25}%`;
    strengthFill.style.backgroundColor = color;
    strengthText.textContent = `Password strength: ${text}`;
    strengthText.style.color = color;

    // Check password match
    checkPasswordMatch();
  });

  // Confirm password checker
  confirmPasswordInput.addEventListener('input', checkPasswordMatch);

  function checkPasswordMatch() {
    const password = passwordInput.value;
    const confirm = confirmPasswordInput.value;
    
    if (!confirm) {
      passwordMatch.textContent = '';
      passwordMatch.className = 'validation-message';
      return;
    }

    if (password === confirm) {
      passwordMatch.textContent = '✓ Passwords match';
      passwordMatch.className = 'validation-message success';
    } else {
      passwordMatch.textContent = '✗ Passwords do not match';
      passwordMatch.className = 'validation-message error';
    }
  }

  // Form submission
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();
    const terms = document.getElementById('terms').checked;
    const messageDiv = document.getElementById('signupMessage');

    // Clear previous message
    messageDiv.textContent = '';
    messageDiv.className = 'message';

    // Validation
    if (password !== confirmPassword) {
      messageDiv.textContent = 'Passwords do not match!';
      messageDiv.className = 'message error';
      shakeForm();
      return;
    }

    if (!terms) {
      messageDiv.textContent = 'Please accept the terms and conditions';
      messageDiv.className = 'message error';
      return;
    }

    if (password.length < 8) {
      messageDiv.textContent = 'Password must be at least 8 characters long';
      messageDiv.className = 'message error';
      return;
    }

    // Show loading state
    const submitBtn = signupForm.querySelector('.submit-btn');
    const originalText = submitBtn.querySelector('.btn-text').textContent;
    submitBtn.querySelector('.btn-text').textContent = 'Creating Account...';
    submitBtn.disabled = true;

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        messageDiv.textContent = "✓ Account created successfully! Logging you in...";
        messageDiv.className = 'message success';

        // Auto-login after successful signup
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const loginData = await loginRes.json();

        if (loginData.token) {
          localStorage.setItem("token", loginData.token);
          
          setTimeout(() => {
            // Redirect based on role (new users typically get user role)
            if (loginData.role === "admin") {
              window.location.href = "../AdminDashBoard/Admin.html";
            } else {
              window.location.href = "../HomePage/index.html";
            }
          }, 1500);
        }
      } else {
        messageDiv.textContent = data.message || "Signup failed. Please try again.";
        messageDiv.className = 'message error';
        shakeForm();
      }
    } catch (error) {
      messageDiv.textContent = "Network error. Please check your connection.";
      messageDiv.className = 'message error';
      console.error('Signup error:', error);
    } finally {
      // Reset button state
      submitBtn.querySelector('.btn-text').textContent = originalText;
      submitBtn.disabled = false;
    }
  });

  // Social signup buttons
  document.querySelector('.social-btn.google')?.addEventListener('click', () => {
    alert('Google signup would be implemented here');
  });

  document.querySelector('.social-btn.github')?.addEventListener('click', () => {
    alert('GitHub signup would be implemented here');
  });

  // Shake animation for form errors
  function shakeForm() {
    const form = document.querySelector('.form-container');
    form.style.animation = 'none';
    setTimeout(() => {
      form.style.animation = 'shake 0.5s ease-in-out';
    }, 10);
  }
});

// Add shake animation to CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
  }
`;
document.head.appendChild(style);document.addEventListener('DOMContentLoaded', function() {
  const signupForm = document.getElementById('signupForm');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const togglePassword = document.getElementById('togglePassword');
  const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
  const strengthFill = document.getElementById('strengthFill');
  const strengthText = document.getElementById('strengthText');
  const passwordMatch = document.getElementById('passwordMatch');

  // Toggle password visibility
  [togglePassword, toggleConfirmPassword].forEach((btn, index) => {
    if (btn) {
      btn.addEventListener('click', function() {
        const input = index === 0 ? passwordInput : confirmPasswordInput;
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
      });
    }
  });

  // Password strength checker with improved algorithm
  passwordInput.addEventListener('input', function() {
    const password = this.value;
    updatePasswordStrength(password);
    checkPasswordMatch();
  });

  // Confirm password checker
  confirmPasswordInput.addEventListener('input', checkPasswordMatch);

  function updatePasswordStrength(password) {
    if (!strengthFill || !strengthText) return;
    
    let score = 0;
    let suggestions = [];
    
    // Length check
    if (password.length >= 12) score += 2;
    else if (password.length >= 8) score += 1;
    else suggestions.push('Use at least 8 characters');
    
    // Character variety checks
    if (/[A-Z]/.test(password)) score += 1;
    else suggestions.push('Add uppercase letters');
    
    if (/[a-z]/.test(password)) score += 1;
    else suggestions.push('Add lowercase letters');
    
    if (/[0-9]/.test(password)) score += 1;
    else suggestions.push('Add numbers');
    
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    else suggestions.push('Add special characters');
    
    // Deduplicate suggestions
    suggestions = [...new Set(suggestions)];
    
    // Calculate percentage and set colors/text
    const percentage = (score / 6) * 100;
    let strength = '';
    let color = '';
    
    if (password.length === 0) {
      strength = 'Enter a password';
      color = '#94a3b8';
    } else if (percentage < 40) {
      strength = 'Very Weak';
      color = '#ef4444';
    } else if (percentage < 60) {
      strength = 'Weak';
      color = '#f97316';
    } else if (percentage < 80) {
      strength = 'Fair';
      color = '#f59e0b';
    } else if (percentage < 95) {
      strength = 'Good';
      color = '#84cc16';
    } else {
      strength = 'Strong';
      color = '#10b981';
    }
    
    // Update UI
    strengthFill.style.width = `${percentage}%`;
    strengthFill.style.background = color;
    strengthText.textContent = `Password strength: ${strength}`;
    strengthText.style.color = color;
    
    // Add tooltip with suggestions
    if (suggestions.length > 0 && percentage < 80) {
      strengthText.title = 'Suggestions: ' + suggestions.join(', ');
    } else {
      strengthText.title = '';
    }
  }

  function checkPasswordMatch() {
    if (!passwordMatch) return;
    
    const password = passwordInput.value;
    const confirm = confirmPasswordInput.value;
    
    if (!confirm) {
      passwordMatch.textContent = '';
      passwordMatch.className = 'validation-message';
      return;
    }

    if (password === confirm) {
      passwordMatch.textContent = '✓ Passwords match';
      passwordMatch.className = 'validation-message success';
    } else {
      passwordMatch.textContent = '✗ Passwords do not match';
      passwordMatch.className = 'validation-message error';
    }
  }

  // Form submission
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();
    const terms = document.getElementById('terms');
    const messageDiv = document.getElementById('signupMessage');

    // Clear previous message
    messageDiv.textContent = '';
    messageDiv.className = 'message';

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      messageDiv.textContent = 'Please fill in all fields';
      messageDiv.className = 'message error';
      shakeForm();
      return;
    }

    if (password !== confirmPassword) {
      messageDiv.textContent = 'Passwords do not match!';
      messageDiv.className = 'message error';
      passwordInput.focus();
      shakeForm();
      return;
    }

    if (!terms?.checked) {
      messageDiv.textContent = 'Please accept the terms and conditions';
      messageDiv.className = 'message error';
      return;
    }

    if (password.length < 8) {
      messageDiv.textContent = 'Password must be at least 8 characters long';
      messageDiv.className = 'message error';
      passwordInput.focus();
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      messageDiv.textContent = 'Please enter a valid email address';
      messageDiv.className = 'message error';
      document.getElementById('email').focus();
      return;
    }

    // Show loading state
    const submitBtn = signupForm.querySelector('.submit-btn');
    const originalText = submitBtn.querySelector('.btn-text').textContent;
    submitBtn.querySelector('.btn-text').textContent = 'Creating Account...';
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.8';

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        messageDiv.textContent = "✓ Account created successfully! Logging you in...";
        messageDiv.className = 'message success';
        
        // Add pulse animation
        submitBtn.style.animation = 'pulse 1.5s infinite';

        // Auto-login after successful signup
        try {
          const loginRes = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });

          const loginData = await loginRes.json();

          if (loginData.token) {
            localStorage.setItem("token", loginData.token);
            
            setTimeout(() => {
              // Redirect based on role (new users typically get user role)
              if (loginData.role === "admin") {
                window.location.href = "../AdminDashBoard/Admin.html";
              } else {
                window.location.href = "../HomePage/index.html";
              }
            }, 1500);
          }
        } catch (loginError) {
          messageDiv.textContent = "Account created! Please log in manually.";
          messageDiv.className = 'message info';
          setTimeout(() => {
            window.location.href = "login.html";
          }, 2000);
        }
      } else {
        messageDiv.textContent = data.message || "Signup failed. Please try again.";
        messageDiv.className = 'message error';
        shakeForm();
      }
    } catch (error) {
      messageDiv.textContent = "Network error. Please check your connection.";
      messageDiv.className = 'message error';
      console.error('Signup error:', error);
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

  // Add validation CSS if not already present
  if (!document.querySelector('style[data-validation-styles]')) {
    const style = document.createElement('style');
    style.setAttribute('data-validation-styles', 'true');
    style.textContent = `
      .validation-message {
        font-size: 13px;
        margin-top: 8px;
        padding: 6px 10px;
        border-radius: 6px;
        display: none;
        font-weight: 500;
      }
      
      .validation-message.success {
        color: #10b981;
        background: rgba(16, 185, 129, 0.1);
        display: block;
        border-left: 3px solid #10b981;
      }
      
      .validation-message.error {
        color: #ef4444;
        background: rgba(239, 68, 68, 0.1);
        display: block;
        border-left: 3px solid #ef4444;
      }
    `;
    document.head.appendChild(style);
  }

  // Shake animation for form errors
  function shakeForm() {
    const form = document.querySelector('.form');
    if (form) {
      form.style.animation = 'none';
      requestAnimationFrame(() => {
        form.style.animation = 'shake 0.5s ease-in-out';
      });
    }
  }
});

// Add animations to CSS if not already present
if (!document.querySelector('style[data-signup-animations]')) {
  const style = document.createElement('style');
  style.setAttribute('data-signup-animations', 'true');
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
      20%, 40%, 60%, 80% { transform: translateX(8px); }
    }
  `;
  document.head.appendChild(style);
}