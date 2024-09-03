importScripts('background_db.js');

// My API Keys
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
        if (data.results){
            return data.results.in_database && data.results.verified ? true : false;
        }
        return false;
    } else {
        console.error('Proxy request failed');
        return false;
    }
}


// Function to check URL with OpenPhish
async function checkOpenPhish(url) {
    const endpoint = `https://openphish.com/feed.txt`;  // Free feed, no API key needed
    const response = await fetch(endpoint, {
        mode: 'no-cors'
    });
    const text = await response.text();
    const phishingUrls = text.split('\n');

    return phishingUrls.includes(url);
}

// Function to check all APIs
// Blocking the request if flagged in the local database
async function checkUrl(url, tabId) {
    const isThreat = await checkLocalThreatList(url);

    if (isThreat) {
        // Show an alert or some sort of notification to the user
        const userResponse = confirm(`Warning: The URL ${url} has been flagged as potentially dangerous. Do you want to proceed anyway?`);

        if (!userResponse) {
            // Block the navigation
            chrome.tabs.update(tabId, { url: "about:blank" });
            alert("Navigation blocked for your safety.");
            return;
        }
    }

    // Proceed with async API checks in the background
    setTimeout(async () => {
        const googleResult = await checkGoogleSafeBrowsing(url);
        const phishTankResult = await checkPhishTank(url);
        const openPhishResult = false;  //await checkOpenPhish(url);
    
        if (googleResult || phishTankResult || openPhishResult) {
            console.log(`Warning: The URL ${url} has been flagged as potentially dangerous by one of the external sources.`);
    
            // Change the icon to red
            chrome.action.setIcon({
                path: {
                    "16": "images/icon_red16.png",
                    "48": "images/icon_red48.png",
                    "128": "images/icon_red128.png"
                },
                tabId: tabId // Only for the current tab
            });
    
            // Warning popup
            chrome.action.setPopup({
                tabId: tabId,
                popup: "popup.html"
            });
            
            // Alert Directly?
            alert("Warning: The URL you are visiting has been flagged as potentially dangerous.");
            
        } else {
            console.log(`The URL ${url} appears to be safe.`);
        }
    }, 0);
    
}

// Listen for completed navigation and check the URL
chrome.webNavigation.onBeforeNavigate.addListener(async function(details) {
    const url = details.url;
    const tabId = details.tabId;
    await checkUrl(url, tabId);
});
