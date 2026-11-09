const mongoose = require('mongoose');
const Product = require('../models/Product');
const fallbackProducts = require('../data/productsData');

// Helper to check if MongoDB is connected (readyState === 1)
const isDBConnected = () => mongoose.connection.readyState === 1;

// @desc    Fetch all products with filtering, search and sorting
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res, next) => {
  try {
    const { keyword, category, sort, minPrice, maxPrice } = req.query;

    if (isDBConnected()) {
      let query = {};

      if (keyword && keyword.trim() !== '') {
        const searchRegex = new RegExp(keyword.trim(), 'i');
        query.$or = [
          { name: searchRegex },
          { description: searchRegex },
          { category: searchRegex }
        ];
      }

      if (category && category !== 'All' && category.trim() !== '') {
        query.category = new RegExp(`^${category.trim()}$`, 'i');
      }

      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = Number(minPrice);
        if (maxPrice) query.price.$lte = Number(maxPrice);
      }

      let sortOption = { createdAt: -1 };
      if (sort === 'price-asc') sortOption = { price: 1 };
      else if (sort === 'price-desc') sortOption = { price: -1 };
      else if (sort === 'rating') sortOption = { rating: -1 };
      else if (sort === 'name') sortOption = { name: 1 };

      const products = await Product.find(query).sort(sortOption);

      return res.status(200).json({
        success: true,
        count: products.length,
        dataSource: 'mongodb',
        data: products
      });
    }

    // Fallback if MongoDB is not running yet (ensures smooth preview)
    let filtered = fallbackProducts.map((p, index) => ({
      _id: `prod_mock_${index + 1}`,
      ...p
    }));

    if (keyword && keyword.trim() !== '') {
      const kw = keyword.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(kw) ||
          p.description.toLowerCase().includes(kw) ||
          p.category.toLowerCase().includes(kw)
      );
    }

    if (category && category !== 'All' && category.trim() !== '') {
      filtered = filtered.filter(
        (p) => p.category.toLowerCase() === category.trim().toLowerCase()
      );
    }

    if (minPrice) filtered = filtered.filter((p) => p.price >= Number(minPrice));
    if (maxPrice) filtered = filtered.filter((p) => p.price <= Number(maxPrice));

    if (sort === 'price-asc') filtered.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') filtered.sort((a, b) => b.rating - a.rating);
    else if (sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({
      success: true,
      count: filtered.length,
      dataSource: 'catalog-seed',
      data: filtered
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Fetch featured products for home page
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProducts = async (req, res, next) => {
  try {
    if (isDBConnected()) {
      let featured = await Product.find({ featured: true }).limit(8);
      if (featured.length === 0) {
        featured = await Product.find({}).sort({ rating: -1 }).limit(8);
      }
      return res.status(200).json({
        success: true,
        count: featured.length,
        dataSource: 'mongodb',
        data: featured
      });
    }

    // Fallback if MongoDB is starting or offline
    const featured = fallbackProducts
      .filter((p) => p.featured)
      .slice(0, 8)
      .map((p, index) => ({
        _id: `prod_mock_${index + 1}`,
        ...p
      }));

    res.status(200).json({
      success: true,
      count: featured.length,
      dataSource: 'catalog-seed',
      data: featured
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all unique categories
// @route   GET /api/products/categories
// @access  Public
const getCategories = async (req, res, next) => {
  try {
    if (isDBConnected()) {
      const categories = await Product.distinct('category');
      return res.status(200).json({
        success: true,
        data: categories
      });
    }

    const categories = [...new Set(fallbackProducts.map((p) => p.category))];
    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Fetch single product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isDBConnected() && mongoose.Types.ObjectId.isValid(id)) {
      const product = await Product.findById(id);
      if (product) {
        const related = await Product.find({
          category: product.category,
          _id: { $ne: product._id }
        }).limit(4);

        return res.status(200).json({
          success: true,
          data: product,
          related
        });
      }
    }

    // Check fallback products
    let product = null;
    let fallbackIndex = -1;

    if (id.startsWith('prod_mock_')) {
      fallbackIndex = parseInt(id.replace('prod_mock_', ''), 10) - 1;
      if (fallbackIndex >= 0 && fallbackIndex < fallbackProducts.length) {
        product = { _id: id, ...fallbackProducts[fallbackIndex] };
      }
    } else {
      product = fallbackProducts.find((p) => p._id === id || p.name === id);
    }

    if (!product && fallbackProducts.length > 0) {
      // Default to first item if ID not found in mock
      product = { _id: id, ...fallbackProducts[0] };
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const related = fallbackProducts
      .filter((p) => p.category === product.category && p.name !== product.name)
      .slice(0, 4)
      .map((p, idx) => ({ _id: `prod_mock_rel_${idx}`, ...p }));

    res.status(200).json({
      success: true,
      data: product,
      related
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getFeaturedProducts,
  getCategories,
  getProductById
};
