require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL connection setup
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Middleware to parse JSON requests
app.use(express.json());

// Root route for testing
app.get('/', (req, res) => {
    res.send('Hello, welcome to the social services chatbot MVP!');
});

// Fetch all services from PostgreSQL
app.get('/services', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM services ORDER BY id ASC');
        res.json({ services: result.rows });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Service Matching - Query based on user input
app.post('/match', async (req, res) => {
    try {
        const { employmentStatus, housingStatus, familySize } = req.body;
        let matchedServices = [];

        if (employmentStatus && employmentStatus.toLowerCase() === 'unemployed') {
            const result = await pool.query("SELECT * FROM services WHERE service_name = 'Unemployment Benefit'");
            matchedServices.push(...result.rows);
        }

        if (housingStatus && housingStatus.toLowerCase() === 'homeless') {
            const result = await pool.query("SELECT * FROM services WHERE service_name = 'Emergency Housing Assistance'");
            matchedServices.push(...result.rows);
        }

        if (familySize && familySize >= 3) {
            const result = await pool.query("SELECT * FROM services WHERE service_name = 'Family Support Program'");
            matchedServices.push(...result.rows);
        }

        if (matchedServices.length === 0) {
            const result = await pool.query("SELECT * FROM services WHERE service_name = 'General Social Support'");
            matchedServices.push(...result.rows);
        }

        res.json({ matchedServices });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Insert a New Service
app.post('/services', async (req, res) => {
    try {
        const { service_name, description, eligibility, contact } = req.body;
        const result = await pool.query(
            'INSERT INTO services (service_name, description, eligibility, contact) VALUES ($1, $2, $3, $4) RETURNING *',
            [service_name, description, eligibility, contact]
        );
        res.status(201).json({ message: 'Service added successfully', service: result.rows[0] });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Chatbot Interaction
app.post('/chat', (req, res) => {
    const { message } = req.body;
    const response = processChatMessage(message);
    res.json({ response });
});

// Chatbot Logic
function processChatMessage(message) {
    if (!message) return "I'm not sure how to respond. Can you rephrase?";

    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
        return "Hi there! How can I assist you today?";
    }

    if (lowerMessage.includes("help") || lowerMessage.includes("assistance")) {
        return "I can help you find social services. Tell me about your situation (e.g., unemployed, need housing support, etc.).";
    }

    if (lowerMessage.includes("unemployment") || lowerMessage.includes("job loss")) {
        return "If you're unemployed, you might be eligible for financial support. Try our /match service to check eligibility.";
    }

    return `I didn't quite understand that. Can you provide more details?`;
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
