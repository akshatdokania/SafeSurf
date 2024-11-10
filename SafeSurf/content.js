chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle showing the alert for NLP phishing detection
    if (message.action === 'showAlert') {
        alert(message.message); // Show the alert box with the message
        sendResponse(true); // Optionally send a response if needed
    } 
    // Handle the full-page warning for flagged URLs
    else if (message.action === 'showFullPageWarning') {
        // Create and inject the custom styles for the buttons
        const style = document.createElement('style');
        style.innerHTML = `
            #backToSafety {
                margin-top: 20px;
                padding: 10px 20px;
                font-size: 18px;
                background-color: white;
                border: 1px solid #4CAF50;  /* Green border */
                color: #4CAF50;  /* Green text */
                cursor: pointer;
            }

            #continueAnyway {
                margin-top: 10px;
                padding: 10px 20px;
                font-size: 18px;
                background-color: white;
                border: 1px solid #f44336;  /* Red border */
                color: #f44336;  /* Red text */
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);

        // Display full-page warning with custom message and buttons
        const warningDiv = document.createElement('div');
        warningDiv.style.position = 'fixed';
        warningDiv.style.top = '0';
        warningDiv.style.left = '0';
        warningDiv.style.width = '100%';
        warningDiv.style.height = '100%';
        warningDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
        warningDiv.style.color = 'white';
        warningDiv.style.display = 'flex';
        warningDiv.style.justifyContent = 'center';
        warningDiv.style.alignItems = 'center';
        warningDiv.style.fontSize = '24px';
        warningDiv.style.fontWeight = 'bold';
        warningDiv.style.zIndex = '9999';
        warningDiv.style.flexDirection = 'column';
        warningDiv.style.textAlign = 'center';
        
        warningDiv.innerHTML = `
            <div style="font-size: 100px; margin-bottom: 20px;">⚠️</div>
            <p>${message.message}</p>
            <button id="backToSafety">BACK TO SAFETY</button>
            <button id="continueAnyway">CONTINUE ANYWAY</button>
        `;
        
        document.body.appendChild(warningDiv);

        // Event listener for "BACK TO SAFETY"
        document.getElementById('backToSafety').addEventListener('click', () => {
            window.history.back();  // Go back to the previous page
        });

        // Event listener for "CONTINUE ANYWAY"
        document.getElementById('continueAnyway').addEventListener('click', () => {
            warningDiv.style.display = 'none';  // Hide the warning and allow the user to stay
        });
    }

    return true; // Required to keep the message channel open for sendResponse
});
