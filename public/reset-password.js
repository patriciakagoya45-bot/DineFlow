const resetMessage = document.getElementById('resetMessage');
const resetLinks = document.getElementById('resetLinks');
const requestResetForm = document.getElementById('requestResetForm');
const newPasswordForm = document.getElementById('newPasswordForm');
const resetToken = new URLSearchParams(window.location.search).get('token');

function showResetMessage(message, isError = false) {
    resetMessage.textContent = message;
    resetMessage.className = isError ? 'error-message' : 'success-message';
}

function showDevelopmentResetLinks(links = []) {
    resetLinks.replaceChildren();
    resetLinks.hidden = links.length === 0;
    if (!links.length) return;

    const message = document.createElement('p');
    message.className = 'form-help';
    message.textContent = 'Email delivery is not configured. Use this local development link:';
    resetLinks.appendChild(message);

    links.forEach(({ role, path }) => {
        const link = document.createElement('a');
        link.className = 'auth-secondary-link';
        link.href = new URL(path, window.location.origin).href;
        link.textContent = `Reset ${role} password`;
        resetLinks.appendChild(link);
    });
}

if (resetToken) {
    requestResetForm.hidden = true;
    newPasswordForm.hidden = false;
    window.history.replaceState(null, '', window.location.pathname);
}

requestResetForm.addEventListener('submit', async event => {
    event.preventDefault();
    const button = requestResetForm.querySelector('button[type="submit"]');
    button.disabled = true;
    showDevelopmentResetLinks();
    showResetMessage('Sending reset link...');

    try {
        const result = await DineFlowAuth.request('auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({
                email: document.getElementById('resetEmail').value.trim()
            })
        });
        showResetMessage(result.message);
        showDevelopmentResetLinks(result.data?.resetLinks);
    } catch (error) {
        showResetMessage(error.message, true);
    } finally {
        button.disabled = false;
    }
});

newPasswordForm.addEventListener('submit', async event => {
    event.preventDefault();
    const password = document.getElementById('newPassword').value;
    const confirmation = document.getElementById('confirmPassword').value;
    if (password !== confirmation) {
        showResetMessage('The passwords do not match.', true);
        return;
    }

    const button = newPasswordForm.querySelector('button[type="submit"]');
    button.disabled = true;
    showResetMessage('Updating password...');

    try {
        const result = await DineFlowAuth.request('auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token: resetToken, password })
        });
        newPasswordForm.hidden = true;
        showResetMessage(result.message);
    } catch (error) {
        showResetMessage(error.message, true);
    } finally {
        button.disabled = false;
    }
});