const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const setRoutes = require('./routes/setRoutes');
const cardRoutes = require('./routes/cardRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Mount API routes
app.use('/api', authRoutes);
app.use('/api', setRoutes);
app.use('/api', cardRoutes);
app.use('/api', adminRoutes);

// Health check & SPA Fallback for static frontend build
const frontendDist = path.join(__dirname, '../vocabulary-frontend/dist');
const indexPath = path.join(frontendDist, 'index.html');

if (require('fs').existsSync(indexPath)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(indexPath);
  });
} else {
  app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'VocabQuiz Backend API is running!' });
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
