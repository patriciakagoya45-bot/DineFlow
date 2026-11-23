const settingsForm = document.getElementById('settingsForm');
const settingsMessage = document.getElementById('settingsMessage');

async function loadSettings() {
    try {
        const result = await DineFlowAuth.request('settings');
        document.getElementById('restaurantName').value = result.data.restaurantName;
        document.getElementById('tableCount').value = result.data.tableCount;
    } catch (error) {
        settingsMessage.textContent = error.message;
    }
}

settingsForm.addEventListener('submit', async event => {
    event.preventDefault();
    try {
        const result = await DineFlowAuth.request('settings', {
            method: 'PUT',
            body: JSON.stringify({
                restaurantName: document.getElementById('restaurantName').value.trim(),
                tableCount: Number(document.getElementById('tableCount').value)
            })
        });
        settingsMessage.textContent = result.message;
    } catch (error) {
        settingsMessage.textContent = error.message;
    }
});

loadSettings();