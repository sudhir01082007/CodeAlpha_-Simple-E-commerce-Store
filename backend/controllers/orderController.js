const mongoose = require('mongoose');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

const isDBConnected = () => mongoose.connection.readyState === 1;

// @desc    Create new order from cart with atomic inventory deduction and rollback
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res, next) => {
  try {
    if (!isDBConnected()) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB database is not connected. Please verify your MongoDB service or MONGODB_URI in backend/.env.'
      });
    }

    const { shippingAddress, paymentMethod } = req.body;

    // Validate shipping details
    if (
      !shippingAddress ||
      !shippingAddress.fullName ||
      !shippingAddress.phone ||
      !shippingAddress.address ||
      !shippingAddress.city ||
      !shippingAddress.postalCode
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required shipping address fields: fullName, phone, address, city, postalCode'
      });
    }

    // Get user's cart from MongoDB
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty. Cannot place an empty order.'
      });
    }

    // Clean up any cart items where the product was deleted
    cart.items = cart.items.filter((item) => item.product != null);
    if (cart.items.length === 0) {
      await cart.save();
      return res.status(400).json({
        success: false,
        message: 'The items in your cart are no longer available in the store catalog'
      });
    }

    const orderItems = [];
    const decrementedProducts = []; // Tracks decrements for safe rollback if any step fails

    try {
      for (const item of cart.items) {
        const prodId = item.product._id || item.product;
        const requestedQty = item.quantity;

        // ATOMIC CONDITIONAL INVENTORY DEDUCTION:
        // Using findOneAndUpdate with condition { stock: { $gte: requestedQty } } guarantees that
        // even with simultaneous concurrent orders, no two transactions can overdraw stock!
        const updatedProduct = await Product.findOneAndUpdate(
          { _id: prodId, stock: { $gte: requestedQty } },
          { $inc: { stock: -requestedQty } },
          { new: true }
        );

        if (!updatedProduct) {
          const currentProd = await Product.findById(prodId);
          const prodName = currentProd ? currentProd.name : (item.name || 'Product');
          const availableStock = currentProd ? currentProd.stock : 0;
          throw new Error(
            currentProd
              ? `Insufficient stock for "${prodName}". Requested: ${requestedQty}, Available: ${availableStock}`
              : `Product "${prodName}" is no longer available`
          );
        }

        decrementedProducts.push({ productId: prodId, quantity: requestedQty });

        orderItems.push({
          product: updatedProduct._id,
          name: updatedProduct.name,
          price: updatedProduct.price, // Authoritative server-side price
          quantity: requestedQty,
          image: updatedProduct.image
        });
      }

      // Authoritative server-side calculation of financial totals
      const itemsPrice = Number(
        orderItems.reduce((acc, i) => acc + i.price * i.quantity, 0).toFixed(2)
      );
      const shippingPrice = itemsPrice > 50 || itemsPrice === 0 ? 0 : 5.99;
      const taxPrice = Number((itemsPrice * 0.08).toFixed(2));
      const totalPrice = Number((itemsPrice + shippingPrice + taxPrice).toFixed(2));

      // Create Order in MongoDB
      const order = new Order({
        user: req.user._id,
        items: orderItems,
        shippingAddress,
        paymentMethod: paymentMethod || 'Cash on Delivery',
        itemsPrice,
        shippingPrice,
        taxPrice,
        totalPrice,
        status: 'Confirmed',
        isPaid: paymentMethod !== 'Cash on Delivery',
        paidAt: paymentMethod !== 'Cash on Delivery' ? new Date() : null
      });

      const savedOrder = await order.save();

      // Clear user's cart in MongoDB ONLY AFTER the order is successfully saved
      cart.items = [];
      await cart.save();

      return res.status(201).json({
        success: true,
        message: 'Order placed successfully!',
        data: savedOrder
      });
    } catch (orderError) {
      // ROLLBACK: Re-increment any products that were already decremented in this failed attempt
      for (const item of decrementedProducts) {
        try {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { stock: item.quantity }
          });
        } catch (rollbackErr) {
          console.error(`Rollback failed for product ${item.productId}:`, rollbackErr.message);
        }
      }

      // The cart remains intact so the user does not lose their shopping cart
      return res.status(400).json({
        success: false,
        message: orderError.message
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged in user's order history from MongoDB
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = async (req, res, next) => {
  try {
    if (!isDBConnected()) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB database is not connected. Please verify your MongoDB service or MONGODB_URI in backend/.env.'
      });
    }

    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order details by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res, next) => {
  try {
    if (!isDBConnected()) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB database is not connected. Please verify your MongoDB service or MONGODB_URI in backend/.env.'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify ownership: users can only view their own orders unless they are an admin
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You are not authorized to view another user\'s order.'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById
};
