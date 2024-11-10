chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'showAlert') {
        alert(message.message); // Show the alert box with the message
        sendResponse(true); // Optionally send a response if needed
    } else if (message.action === 'showConfirmation') {
        const userResponse = confirm(`Warning: The URL ${message.url} has been flagged as potentially dangerous. Do you want to proceed anyway?`);
        sendResponse(userResponse); // Send the user's choice back to background.js
    }
    return true; // Required to keep the message channel open for sendResponse
});
