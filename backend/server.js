require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { scheduleNightlyRefresh } = require('./services/pricingFetcher');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
    standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api', limiter);

// Special case for Stripe Webhook which needs raw body
const billingRoutes = require('./routes/billing');
// Note: webhook route is defined in billing.js and uses express.raw() specifically for that route
app.use('/api/billing', billingRoutes);

// General Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.url}`);
        next();
    });
}

// Routes
const cloudPricingRoutes = require('./routes/cloudPricing');
const proposalsRoutes = require('./routes/proposals');
const rfpSearchRoutes = require('./routes/rfpSearch');
const connectorsRoutes = require('./routes/connectors');
const organisationsRoutes = require('./routes/organisations');
const exchangeRatesRoutes = require('./routes/exchangeRates');

app.use('/api/cloud-pricing', cloudPricingRoutes);
app.use('/api/proposals', proposalsRoutes);
app.use('/api/rfp', rfpSearchRoutes);
app.use('/api/connectors', connectorsRoutes);
app.use('/api/org', organisationsRoutes);
app.use('/api/exchange-rates', exchangeRatesRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Exception:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Start server
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Start background jobs
    scheduleNightlyRefresh();
});
