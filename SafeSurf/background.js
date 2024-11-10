importScripts('background_db.js');

// API_KEYS
const PHISHTANK_API_KEY = 'YOUR_PHISHTANK_API_KEY';
const OPENPHISH_API_KEY = 'YOUR_OPENPHISH_API_KEY'; 

// Check URL with Google Safe Browsing
async function checkGoogleSafeBrowsing(url) {
    const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${GOOGLE_SAFE_BROWSING_API_KEY}`;
    const body = {
        client: {
            clientId: "SafeSurf",
            clientVersion: "1.0"
        },
        threatInfo: {
            threatTypes: ["MALWARE", "SOCIAL_ENGINEERING"],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [
                { url: url }
            ]
        }
    };

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    const data = await response.json();
    return data.matches ? true : false;
}

// Check URL with PhishTank
async function checkPhishTank(url) {
    const proxyEndpoint = `http://localhost:3000/proxy/checkPhishTank`;

    const response = await fetch(proxyEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: url })
    });

    if (response.ok) {
        const data = await response.json();
        if (data.results) {
            return data.results.in_database && data.results.verified ? true : false;
        }
        return false;
    } else {
        console.error('Proxy request failed');
        return false;
    }
}

// Check URL with OpenPhish
async function checkOpenPhish(url) {
    const proxyEndpoint = `http://localhost:3000/proxy/checkOpenPhish`;

    const response = await fetch(proxyEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: url })
    });

    if (response.ok) {
        const data = await response.json();
        return data.isPhishing;
    } else {
        console.error('Proxy request failed for OpenPhish');
        return false;
    }
}

// Function to check all APIs and content analysis
async function checkUrl(url, tabId) {
    const isThreat = await checkLocalThreatList(url);

    if (url === "checkingurl.com") {
        isThreat = true;
    }

    if (isThreat) {
        // Send a message to the content script to display the full-page warning
        chrome.tabs.sendMessage(tabId, { 
            action: 'showFullPageWarning', 
            message: 'The site you are trying to visit has been flagged as potentially malicious. The owners of this page may attempt to collect your personal information, ask for your credentials, or serve harmful content. Please proceed with caution or navigate away.' 
        });
        return;  // Exit the function without blocking navigation
    }

    // Perform async API checks for external sources
    setTimeout(async () => {
        const googleResult = await checkGoogleSafeBrowsing(url);
        const phishTankResult = await checkPhishTank(url);
        const openPhishResult = await checkOpenPhish(url);

        if (googleResult || phishTankResult || openPhishResult) {
            console.log(`Warning: The URL ${url} has been flagged as potentially dangerous by one of the external sources.`);
            
            // Send a message to the content script to display the full-page warning
            chrome.tabs.sendMessage(tabId, { 
                action: 'showFullPageWarning', 
                message: 'The site you are trying to visit has been flagged as potentially malicious. The owners of this page may attempt to collect your personal information, ask for your credentials, or serve harmful content. Please proceed with caution or navigate away.' 
            });
        } else {
            console.log(`The URL ${url} appears to be safe.`);
        }
    }, 1000);
}

// Function to check phishing content with NLP model
async function checkPhishingContent(content, tabId) {
    const proxyEndpoint = `http://localhost:3000/proxy/checkPhishing`;

    // Start time for latency measurement
    const startTime = Date.now();

    const response = await fetch(proxyEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: content })
    });

    // End time for latency measurement
    const endTime = Date.now();
    const latency = endTime - startTime;
    console.log(`NLP Phishing Analysis Latency: ${latency} ms`);

    if (response.ok) {
        const data = await response.json();
        if (data.score > 50) {  // Assuming 50 is the threshold for phishing detection
            console.log(`Warning: The webpage content is flagged as phishing by the NLP Model.`);
            
            // Change the icon to red
            chrome.action.setIcon({
                path: {
                    "16": "icons/icon_red16.png",
                    "48": "icons/icon_red48.png",
                    "128": "icons/icon_red128.png"
                },
                tabId: tabId // Only for the current tab
            });

            // Show an alert box to the user
            chrome.tabs.sendMessage(tabId, {
                action: 'showAlert',
                message: 'This website has been flagged by the NLP Model for PHISHING!! Tread CAREFULLY!'
            });
        } else {
            console.log(`The webpage content appears to be safe according to the NLP Model.`);
        }
    } else {
        console.error('Phishing content check failed.');
    }
}

// Listen for completed navigation and check both the URL and the webpage content
chrome.webNavigation.onCompleted.addListener(async function(details) {
    const url = details.url;
    const tabId = details.tabId;

    // Check the URL using external sources
    await checkUrl(url, tabId);

    // Extract the webpage content and send it for phishing analysis using NLP model
    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => document.body.innerText,  // Extract page content
        });

        if (results && results.length > 0) {
            const content = results[0].result;  // Ensure results has content
            checkPhishingContent(content, tabId);  // Send content to server for phishing content check
        } else {
            console.error('No results returned from executeScript.');
        }
    } catch (error) {
        console.error('Error executing script:', error);
    }
});


// Handle toggle state from popup (when user interacts with the toggle)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'togglePrivacy') {
        const isEnabled = message.enabled;
        if (isEnabled) {
            enablePrivacySettings();
        } else {
            disablePrivacySettings();
        }
    }
});

// Function to enable privacy-related settings
function enablePrivacySettings() {
    // Enable Do Not Track
    chrome.privacy.websites.doNotTrackEnabled.set({ value: true }, () => {
        console.log("Do Not Track enabled.");
    });

    // Clear browsing data on exit
    chrome.browsingData.remove({
        since: 0  // This clears all data, time range can be specified
    }, {
        "cookies": true,
        "cache": true,
        "history": true
    }, () => {
        console.log("Browsing data cleared.");
    });

    // Block third-party cookies
    chrome.contentSettings.cookies.set({
        primaryPattern: "<all_urls>",
        setting: "block"
    }, () => {
        console.log("Third-party cookies blocked.");
    });

    // Block access to location
    chrome.contentSettings.location.set({
        primaryPattern: "<all_urls>",
        setting: "block"
    }, () => {
        console.log("Location access blocked.");
    });

    // Block access to camera
    chrome.contentSettings.camera.set({
        primaryPattern: "<all_urls>",
        setting: "block"
    }, () => {
        console.log("Camera access blocked.");
    });

    // Block access to microphone
    chrome.contentSettings.microphone.set({
        primaryPattern: "<all_urls>",
        setting: "block"
    }, () => {
        console.log("Microphone access blocked.");
    });

    // Disable notifications
    chrome.contentSettings.notifications.set({
        primaryPattern: "<all_urls>",
        setting: "block"
    }, () => {
        console.log("Notifications disabled.");
    });
}

// Function to disable privacy settings (reverting to default)
function disablePrivacySettings() {
    // Disable Do Not Track
    chrome.privacy.websites.doNotTrackEnabled.set({ value: false }, () => {
        console.log("Do Not Track disabled.");
    });

    // Unblock third-party cookies
    chrome.contentSettings.cookies.set({
        primaryPattern: "<all_urls>",
        setting: "allow"
    }, () => {
        console.log("Third-party cookies allowed.");
    });
}
