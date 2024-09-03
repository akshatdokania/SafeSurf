const GOOGLE_SAFE_BROWSING_API_KEY = 'AIzaSyAzVlcry_VEbb8Mgsqg16p2zXBr3aJxQPc';
let localThreatList = [];
let threatListState = ""; // To store the state of the last update

// Initialize alarm for periodic updates
chrome.alarms.create('updateThreatList', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'updateThreatList') {
        updateThreatList();
    }
});

// Load threat list and state from local storage on startup
chrome.storage.local.get(['threatList', 'threatListState'], (result) => {
    if (result.threatList) {
        localThreatList = result.threatList;
        console.log('Threat list loaded from storage.');
    }
    if (result.threatListState) {
        threatListState = result.threatListState;
        console.log('State loaded from storage.');
    }
});

// Function to update the threat list from Google Safe Browsing API
async function updateThreatList() {
    const endpoint = `https://safebrowsing.googleapis.com/v4/threatListUpdates:fetch?key=${GOOGLE_SAFE_BROWSING_API_KEY}`;
    const body = {
        client: {
            clientId: "SafeSurf",
            clientVersion: "1.0"
        },
        listUpdateRequests: [
            {
                threatTypes: ["MALWARE", "SOCIAL_ENGINEERING"],
                platformType: "ANY_PLATFORM",
                threatEntryType: "URL",
                state: threatListState,  // Use the stored state for incremental updates
                constraints: {
                    maxUpdateEntries: "2500",
                    maxDatabaseEntries: "500",
                    region: "US",
                    supportedCompressions: ["RAW"]
                }
            }
        ]
    };

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    const data = await response.json();

    if (data.listUpdateResponses && data.listUpdateResponses.length > 0) {
        const updateResponse = data.listUpdateResponses[0];

        // Update the local threat list with the new entries
        localThreatList = updateResponse.additions || [];

        // Update the state with the new state value
        threatListState = updateResponse.state;

        // Save the threat list and state to local storage
        chrome.storage.local.set({ 
            threatList: localThreatList,
            threatListState: threatListState 
        }, () => {
            console.log('Threat list and state updated and saved to storage.');
        });

        console.log('Threat list updated.');
    } else {
        console.log('No new updates to the threat list.');
    }
}

// Function to check URL against the local threat list
async function checkLocalThreatList(url) {
    for (const threat of localThreatList) {
        for (const entry of threat.threatEntries) {
            if (url === entry.url) {
                return true;
            }
        }
    }
    return false;
}

// First update on load
updateThreatList();
