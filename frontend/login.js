const authMessage = document.getElementById('authMessage');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');

function showAuthMessage(message, isError = false) {
    authMessage.textContent = message;
    authMessage.className = isError ? 'error-message' : 'success-message';
}

function showForm(form) {
    const isRegister = form === registerForm;
    loginForm.hidden = isRegister;
    registerForm.hidden = !isRegister;
    loginTab.classList.toggle('active', !isRegister);
    registerTab.classList.toggle('active', isRegister);
    showAuthMessage('');
}

async function enterDashboard(account, token) {
    DineFlowAuth.saveToken(token);
    window.location.replace(DineFlowAuth.dashboardFor(account));
}

loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const button = loginForm.querySelector('button[type="submit"]');
    button.disabled = true;
    showAuthMessage('Signing in...');

    try {
        const result = await DineFlowAuth.request('auth/login', {
            method: 'POST',
            redirectOnUnauthorized: false,
            body: JSON.stringify({
                accountType: document.getElementById('accountType').value,
                email: document.getElementById('email').value.trim(),
                password: document.getElementById('password').value
            })
        });
        await enterDashboard(result.data.account, result.data.token);
    } catch (error) {
        showAuthMessage(error.message, true);
    } finally {
        button.disabled = false;
    }
});

registerForm.addEventListener('submit', async event => {
    event.preventDefault();
    const button = registerForm.querySelector('button[type="submit"]');
    button.disabled = true;
    showAuthMessage('Creating your customer account...');

    try {
        const result = await DineFlowAuth.request('auth/register/customer', {
            method: 'POST',
            redirectOnUnauthorized: false,
            body: JSON.stringify({
                name: document.getElementById('registerName').value.trim(),
                email: document.getElementById('registerEmail').value.trim(),
                phone: document.getElementById('registerPhone').value.trim(),
                password: document.getElementById('registerPassword').value
            })
        });
        await enterDashboard(result.data.account, result.data.token);
    } catch (error) {
        showAuthMessage(error.message, true);
    } finally {
        button.disabled = false;
    }
});

loginTab.addEventListener('click', () => showForm(loginForm));
registerTab.addEventListener('click', () => showForm(registerForm));

document.addEventListener('DOMContentLoaded', async () => {
    if (!DineFlowAuth.token()) return;
    try {
        const account = await DineFlowAuth.currentAccount();
        window.location.replace(DineFlowAuth.dashboardFor(account));
    } catch {
        DineFlowAuth.clearToken();
    }
});