const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price must be positive']
    },
    originalPrice: {
      type: Number,
      default: function () {
        return Math.round(this.price * 1.25);
      }
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
      index: true
    },
    image: {
      type: String,
      required: [true, 'Product image URL is required']
    },
    brand: {
      type: String,
      default: 'CodeAlpha Collection'
    },
    rating: {
      type: Number,
      default: 4.5,
      min: 0,
      max: 5
    },
    numReviews: {
      type: Number,
      default: 15
    },
    stock: {
      type: Number,
      required: [true, 'Product stock count is required'],
      default: 15,
      min: 0
    },
    featured: {
      type: Boolean,
      default: false,
      index: true
    },
    badge: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Add text index for fast search queries
productSchema.index({ name: 'text', description: 'text', category: 'text' });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;

