require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing.');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');
const mongoSanitize = require('express-mongo-sanitize');

// Connect to Database
connectDB().then(() => {
  const seedAdmin = require('./utils/seed');
  seedAdmin();
});

const app = express();

// =======================
// CORS Configuration
// =======================
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions)); // Handle preflight requests

// =======================
// Express Middlewares
// =======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/clubs', require('./routes/clubs'));
app.use('/api/events', require('./routes/events'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/upload', require('./routes/upload'));

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date()
  });
});

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`
  );
});