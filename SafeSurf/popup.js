document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.getElementById('privacyToggle');
    const statusMessage = document.getElementById('statusMessage');
    const alertMessage = document.getElementById('alertMessage');
    const phishingAlert = document.getElementById('phishingAlert');

    // Initial setup from storage
    chrome.storage.sync.get('privacyEnabled', function(data) {
        toggle.checked = data.privacyEnabled || false;
        updateStatusMessage(toggle.checked);
    });

    // Listen for messages indicating phishing detection
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'phishingDetected') {
            showPhishingAlert(message.explanation);
        }
    });

    toggle.addEventListener('change', function() {
        const isEnabled = toggle.checked;
        chrome.storage.sync.set({ privacyEnabled: isEnabled }, function() {
            updateStatusMessage(isEnabled);
            chrome.runtime.sendMessage({ action: 'togglePrivacy', enabled: isEnabled });
            showAlert(isEnabled);
        });
    });

    function updateStatusMessage(isEnabled) {
        if (isEnabled) {
            statusMessage.textContent = "Privacy is ON";
            statusMessage.classList.remove('disabled');
            statusMessage.classList.add('enabled');
        } else {
            statusMessage.textContent = "Privacy is OFF";
            statusMessage.classList.remove('enabled');
            statusMessage.classList.add('disabled');
        }
    }

    function showAlert(isEnabled) {
        if (isEnabled) {
            alertMessage.innerHTML = `
                Privacy mode is now enabled.<br>
                <ul>
                    <li>Do Not Track is enabled.</li>
                    <li>Third-party cookies are blocked.</li>
                    <li>Access to location, camera, and microphone is blocked.</li>
                    <li>Notifications are disabled.</li>
                </ul>
                These changes help protect your privacy by limiting tracking and restricting site permissions.
            `;
            alertMessage.classList.remove('disabled');
            alertMessage.classList.add('enabled');
        } else {
            alertMessage.innerHTML = `
                Privacy mode is now disabled.<br>
                <ul>
                    <li>Do Not Track is turned off.</li>
                    <li>Third-party cookies are allowed.</li>
                </ul>
                Disabling these features may increase tracking and reduce privacy protection.
            `;
            alertMessage.classList.remove('enabled');
            alertMessage.classList.add('disabled');
        }

        alertMessage.style.display = 'block';
        setTimeout(() => {
            alertMessage.style.display = 'none';
        }, 10000); // Hide alert after 10 seconds
    }

    function showPhishingAlert(explanation) {
        phishingAlert.innerHTML = `
            <strong>Warning:</strong> This site has been flagged as phishing!<br>
        `;
        phishingAlert.style.display = 'block';
    }
});
