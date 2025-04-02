require('dotenv').config(); // Load environment variables
const express = require('express');
const mongoose = require('mongoose');
const job = require("./lib/cron")

const authRoutes = require('./routes/authRoutes');
const propertyRoutes = require('./routes/propertyRoutes')


job.start();
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Check environment variables
if (!process.env.DB_URI || !process.env.PORT) {
    console.error("Error: Missing environment variables (DB_URI or PORT).");
    process.exit(1);
}

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/property' , propertyRoutes);

// Connect to MongoDB
mongoose.connect(process.env.DB_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        app.listen(process.env.PORT, () => {
            console.log(`Server is running on port ${process.env.PORT}`);
        });
    })
    .catch(err => {
        console.error('Error connecting to MongoDB:', err);
    });
   

