const cron = require('node-cron');
const fetch = require('node-fetch'); // Ensure you install this if using Node.js <18

const requestData = async () => {
    try {
        const response = await fetch("https://rentify-server-ge0f.onrender.com");
        const data = await response.json();
        console.log("Request successful:", data);
    } catch (error) {
        console.error("Request failed:", error.message);
    }
};

// Schedule to run every 15 minutes
cron.schedule('*/15 * * * *', () => {
    console.log("Running scheduled request...");
    requestData();
});

console.log("Cron job started: Requests every 15 minutes.");
