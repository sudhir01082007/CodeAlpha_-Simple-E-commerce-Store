const express = require('express');
const router = express.Router();
const {
  getProducts,
  getFeaturedProducts,
  getCategories,
  getProductById
} = require('../controllers/productController');

// Product endpoints
router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/categories', getCategories);
router.get('/:id', getProductById);

module.exports = router;

