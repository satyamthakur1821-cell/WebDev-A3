const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');

const router = express.Router();

const validateId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid product ID' });
  }
  next();
};

// CREATE PRODUCT
router.post('/', async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, message: 'Product created successfully', data: product });
  } catch (error) {
    next(error);
  }
});

// GET ALL PRODUCTS - filtering, searching, sorting, pagination
router.get('/', async (req, res, next) => {
  try {
    const { category, search, minPrice, maxPrice, minStock, maxStock, sort = '-createdAt' } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const filter = {};

    if (category) filter.category = new RegExp(`^${category}$`, 'i');
    if (search) filter.name = { $regex: search, $options: 'i' };

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
    }

    if (minStock !== undefined || maxStock !== undefined) {
      filter.stock = {};
      if (minStock !== undefined) filter.stock.$gte = Number(minStock);
      if (maxStock !== undefined) filter.stock.$lte = Number(maxStock);
    }

    const allowedSortFields = ['name', 'price', 'stock', 'createdAt', 'category'];
    const sortParts = String(sort).split(',');
    const sortObject = {};

    sortParts.forEach((part) => {
      const field = part.startsWith('-') ? part.slice(1) : part;
      if (allowedSortFields.includes(field)) {
        sortObject[field] = part.startsWith('-') ? -1 : 1;
      }
    });

    if (!Object.keys(sortObject).length) sortObject.createdAt = -1;

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sortObject).skip(skip).limit(limit),
      Product.countDocuments(filter)
    ]);

    res.json({
      success: true,
      count: products.length,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: products
    });
  } catch (error) {
    next(error);
  }
});

// LOW-STOCK REPORT
router.get('/reports/low-stock', async (req, res, next) => {
  try {
    const threshold = Number(req.query.threshold);
    const filter = {};

    if (Number.isFinite(threshold) && threshold >= 0) {
      filter.stock = { $lte: threshold };
    } else {
      filter.$expr = { $lte: ['$stock', '$lowStockThreshold'] };
    }

    const products = await Product.find(filter).sort({ stock: 1, name: 1 });

    res.json({
      success: true,
      report: 'Low-stock products',
      threshold: Number.isFinite(threshold) && threshold >= 0 ? threshold : 'product-specific threshold',
      count: products.length,
      data: products
    });
  } catch (error) {
    next(error);
  }
});

// CATEGORY-WISE INVENTORY SUMMARY - aggregation
router.get('/reports/category-summary', async (req, res, next) => {
  try {
    const summary = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          totalProducts: { $sum: 1 },
          totalUnits: { $sum: '$stock' },
          totalInventoryValue: { $sum: { $multiply: ['$price', '$stock'] } },
          averagePrice: { $avg: '$price' }
        }
      },
      { $sort: { totalInventoryValue: -1 } },
      {
        $project: {
          _id: 0,
          category: '$_id',
          totalProducts: 1,
          totalUnits: 1,
          totalInventoryValue: { $round: ['$totalInventoryValue', 2] },
          averagePrice: { $round: ['$averagePrice', 2] }
        }
      }
    ]);

    res.json({ success: true, count: summary.length, data: summary });
  } catch (error) {
    next(error);
  }
});

// GET SINGLE PRODUCT
router.get('/:id', validateId, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// UPDATE PRODUCT DETAILS
router.put('/:id', validateId, async (req, res, next) => {
  try {
    const allowedFields = ['name', 'category', 'price', 'stock', 'lowStockThreshold', 'description'];
    const update = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    }

    const product = await Product.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true
    });

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product updated successfully', data: product });
  } catch (error) {
    next(error);
  }
});

// RESTOCK - safely increment stock
router.patch('/:id/restock', validateId, async (req, res, next) => {
  try {
    const quantity = Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be a positive integer' });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $inc: { stock: quantity } },
      { new: true, runValidators: true }
    );

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: `Stock increased by ${quantity}`, data: product });
  } catch (error) {
    next(error);
  }
});

// SALE - safely decrement stock; never allows negative stock
router.patch('/:id/sale', validateId, async (req, res, next) => {
  try {
    const quantity = Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be a positive integer' });
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
      { new: true, runValidators: true }
    );

    if (!product) {
      const exists = await Product.exists({ _id: req.params.id });
      return res.status(exists ? 400 : 404).json({
        success: false,
        message: exists ? 'Insufficient stock for this sale' : 'Product not found'
      });
    }

    res.json({ success: true, message: `Stock decreased by ${quantity}`, data: product });
  } catch (error) {
    next(error);
  }
});

// DELETE PRODUCT
router.delete('/:id', validateId, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product deleted successfully', data: product });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
