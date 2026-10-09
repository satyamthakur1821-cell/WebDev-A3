require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const productRoutes = require('./routes/productRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI is missing. Create a .env file first.');
  process.exit(1);
}

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Inventory and Data Management System API is running'
  });
});

app.use('/api/products', productRoutes);

app.use(notFound);
app.use(errorHandler);

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  });
