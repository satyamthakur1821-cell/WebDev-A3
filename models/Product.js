const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Product name must contain at least 2 characters'],
      maxlength: [100, 'Product name cannot exceed 100 characters']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      minlength: [2, 'Category must contain at least 2 characters']
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative']
    },
    stock: {
      type: Number,
      required: [true, 'Stock is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0
    },
    lowStockThreshold: {
      type: Number,
      min: [0, 'Low-stock threshold cannot be negative'],
      default: 5
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
