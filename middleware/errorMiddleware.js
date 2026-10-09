const mongoose = require('mongoose');

const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
};

const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid MongoDB ID' });
  }

  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: 'Duplicate value already exists' });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
};

module.exports = { notFound, errorHandler };
