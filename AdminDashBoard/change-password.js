// project/admin/change-password.js
const token = localStorage.getItem('token');
if (!token) window.location.href = '../Student-DahBord/login.html';

document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  if (newPassword !== confirmPassword) { alert('New passwords no match'); return; }
  try {
  const res = await fetch("/api/auth/change-password", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}` // if using JWT
  },
  body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
});

    const j = await res.json();
    if (res.ok) { alert('Password changed'); localStorage.removeItem('token'); window.location.href = '../Student-DahBord/login.html'; }
    else alert(j.message || 'Error');
  } catch (err){
    console.error(err);
    alert('Network error');
  }
});
