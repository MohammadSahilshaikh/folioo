// login.js — Supabase Auth sign-in, then check role==='admin' before letting them in.
import { adminSignIn, adminSignOut, adminCurrentProfile } from './supabase-client.js';

const form = document.getElementById('loginForm');
const btn = document.getElementById('loginBtn');
const errBox = document.getElementById('errBox');

function showErr(msg) { errBox.textContent = msg; errBox.classList.add('show'); }
function hideErr() { errBox.classList.remove('show'); }

/* already logged in + admin? skip straight to dashboard */
(async () => {
  const profile = await adminCurrentProfile();
  if (profile && profile.role === 'admin') location.href = 'dashboard.html';
})();

/* show a message if redirected here for not being admin */
if (new URLSearchParams(location.search).get('err') === 'notadmin') {
  showErr('This is not an admin account. Log in with valid admin credentials.');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideErr();
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  const email = document.getElementById('lEmail').value.trim();
  const password = document.getElementById('lPass').value;

  const res = await adminSignIn(email, password);
  if (!res.ok) {
    btn.disabled = false; btn.textContent = 'Login';
    showErr('Incorrect email or password.');
    return;
  }

  const profile = await adminCurrentProfile();
  if (!profile || profile.role !== 'admin') {
    await adminSignOut();
    btn.disabled = false; btn.textContent = 'Login';
    showErr('Ye account admin nahi hai. Supabase me profiles.role = \'admin\' set karein.');
    return;
  }

  location.href = 'dashboard.html';
});
