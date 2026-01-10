require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const generateRoutes = require('./routes/generate');
const authRoutes = require('./routes/auth');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// Routes will go here
app.use('/api/generate', generateRoutes);
app.use('/api/auth', authRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
