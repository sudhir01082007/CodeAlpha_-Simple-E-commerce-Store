const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

const isDBConnected = () => mongoose.connection.readyState === 1;

// Helper to format cart response
const formatCartResponse = (cart) => {
  const totals = cart.calculateTotals();
  return {
    _id: cart._id,
    user: cart.user,
    items: cart.items.map((item) => ({
      _id: item._id,
      product: item.product,
      quantity: item.quantity,
      price: item.price,
      itemTotal: Number((item.price * item.quantity).toFixed(2))
    })),
    totals
  };
};

// @desc    Get logged in user's cart from MongoDB
// @route   GET /api/cart
// @access  Private
const getCart = async (req, res, next) => {
  try {
    if (!isDBConnected()) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB database is not connected. Please verify your MongoDB service or MONGODB_URI in backend/.env.'
      });
    }

    let cart = await Cart.findOne({ user: req.user._id }).populate({
      path: 'items.product',
      select: 'name price image category stock badge'
    });

    if (!cart) {
      // Create empty cart document in MongoDB
      cart = await Cart.create({ user: req.user._id, items: [] });
    } else {
      // Filter out any items whose product was removed from the database
      const initialCount = cart.items.length;
      cart.items = cart.items.filter((item) => item.product != null);

      // Keep cart prices synchronized with real-time server database prices
      cart.items.forEach((item) => {
        if (item.product && typeof item.product.price === 'number') {
          item.price = item.product.price;
        }
      });

      if (cart.items.length !== initialCount || cart.isModified()) {
        await cart.save();
      }
    }

    res.status(200).json({
      success: true,
      data: formatCartResponse(cart)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add product to cart in MongoDB
// @route   POST /api/cart
// @access  Private
const addToCart = async (req, res, next) => {
  try {
    if (!isDBConnected()) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB database is not connected. Please verify your MongoDB service or MONGODB_URI in backend/.env.'
      });
    }

    const { productId, quantity = 1 } = req.body;
    const qty = parseInt(quantity, 10);

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    if (isNaN(qty) || qty < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    // Verify product exists in MongoDB and check stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (product.stock < qty) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} items currently in stock for "${product.name}"`
      });
    }

    // Find or create cart
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    // Check if item already in cart
    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (itemIndex > -1) {
      const newQty = cart.items[itemIndex].quantity + qty;
      if (newQty > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Cannot add more. Reached available stock limit of ${product.stock}`
        });
      }
      cart.items[itemIndex].quantity = newQty;
      cart.items[itemIndex].price = product.price; // authoritative server-side price
    } else {
      cart.items.push({
        product: product._id,
        quantity: qty,
        price: product.price // authoritative server-side price
      });
    }

    await cart.save();

    cart = await Cart.findById(cart._id).populate({
      path: 'items.product',
      select: 'name price image category stock badge'
    });

    res.status(200).json({
      success: true,
      message: `"${product.name}" added to cart`,
      data: formatCartResponse(cart)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update cart item quantity in MongoDB
// @route   PUT /api/cart/:productId
// @access  Private
const updateCartItem = async (req, res, next) => {
  try {
    if (!isDBConnected()) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB database is not connected. Please verify your MongoDB service or MONGODB_URI in backend/.env.'
      });
    }

    const { productId } = req.params;
    const { quantity } = req.body;
    const qty = parseInt(quantity, 10);

    if (isNaN(qty)) {
      return res.status(400).json({
        success: false,
        message: 'Valid quantity number is required'
      });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in your cart'
      });
    }

    // If quantity is 0 or less, remove item
    if (qty <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product no longer exists in catalog'
        });
      }

      if (qty > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stock} items currently in stock`
        });
      }
      cart.items[itemIndex].quantity = qty;
      cart.items[itemIndex].price = product.price; // sync server price
    }

    await cart.save();

    cart = await Cart.findById(cart._id).populate({
      path: 'items.product',
      select: 'name price image category stock badge'
    });

    res.status(200).json({
      success: true,
      message: 'Cart updated successfully',
      data: formatCartResponse(cart)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove item from cart in MongoDB
// @route   DELETE /api/cart/:productId
// @access  Private
const removeCartItem = async (req, res, next) => {
  try {
    if (!isDBConnected()) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB database is not connected. Please verify your MongoDB service or MONGODB_URI in backend/.env.'
      });
    }

    const { productId } = req.params;

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );

    await cart.save();

    cart = await Cart.findById(cart._id).populate({
      path: 'items.product',
      select: 'name price image category stock badge'
    });

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      data: formatCartResponse(cart)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear entire cart in MongoDB
// @route   DELETE /api/cart
// @access  Private
const clearCart = async (req, res, next) => {
  try {
    if (!isDBConnected()) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB database is not connected. Please verify your MongoDB service or MONGODB_URI in backend/.env.'
      });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: {
        items: [],
        totals: {
          subtotal: 0,
          shipping: 0,
          tax: 0,
          total: 0,
          totalItems: 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart
};
