# 🛍️ CodeAlpha Simple E-Commerce Store

[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/sudhir01082007/CodeAlpha_-Simple-E-commerce-Store)
[![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-MongoDB-brightgreen.svg)](https://www.mongodb.com/)
[![Authentication](https://img.shields.io/badge/Auth-JWT%20%26%20bcrypt-orange.svg)](https://jwt.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A complete, modern, responsive full-stack E-Commerce Store web application built for the **CodeAlpha Full Stack Development Internship**.

---

## 🌟 Key Features

1. **Home Page**:
   - Modern sticky navigation bar with cart badge counter and dynamic user profile menu.
   - High-impact hero banner with quick call-to-action buttons.
   - Interactive category cards with instant filtering (Electronics, Fashion, Footwear, Accessories, Home & Living).
   - Dynamic featured products section fetched live from MongoDB.
   - Value proposition guarantee bar (Free express shipping, secure payments, 30-day returns).

2. **Product Catalog & Search**:
   - Real-time debounced search across product names, descriptions, and categories.
   - Category filter pills with active state indicators.
   - Price range filter (Min / Max).
   - Multi-option sorting (Price: Low-High, Price: High-Low, Highest Rated, Alphabetical).
   - Responsive product grid with empty-state handling.

3. **Product Details Page**:
   - High-resolution product images and brand details.
   - Real-time stock status indicator (In Stock, Low Stock alert, Out of Stock).
   - Interactive quantity selector (+ / -) bound to inventory limits in MongoDB.
   - Add to Cart integration with instant toast notifications.
   - Related products recommendation carousel from the same category.

4. **Shopping Cart (MongoDB Persisted)**:
   - Full persistence in MongoDB per authenticated user (never relies on localStorage for cart persistence).
   - Real-time quantity increment/decrement and item removal.
   - Clear entire cart option.
   - Server-side order summary calculation (Subtotal, Free Shipping on orders over $50, 8% Tax, Grand Total).
   - Promo coupon code system (Enter `ALPHA2026` for a 10% discount).

5. **User Authentication & Security**:
   - User registration, login, profile view, and profile update.
   - **Password Hashing**: Irreversible 10-round salt hashing with **bcryptjs**.
   - **JWT Tokens**: Secure authorization header (`Bearer <token>`) with 30-day validity.
   - Flexible login: Supports Email (`demo@codealpha.com`), Username (`demo`), or Display Name (`Demo Customer`).
   - 1-Click Auto-Fill Demo Credentials buttons on the login page for both Customer and Admin roles.

6. **Checkout & Order Placement**:
   - Multi-field shipping address validation (Full Name, Phone, Street, City, State, PIN/Postal Code, Country).
   - Payment method selection: Cash on Delivery (COD), Credit/Debit Card (demo gateway), UPI / Net Banking.
   - Atomic conditional stock deduction to prevent overdraws and race conditions.
   - Cart auto-cleared in MongoDB after successful checkout.

7. **Order History**:
   - Detailed past order records stored permanently in MongoDB.
   - Shows Order ID, order placement date/time, delivery status pill, shipping details, item breakdown, and total price.

8. **100% Responsive Design**:
   - Custom-tailored layouts for mobile smartphones (<480px), tablets (<768px), and desktop displays.
   - Mobile slide-out navigation drawer with touch-friendly tap targets.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript | Semantic markup, responsive flexbox/grid layout, separation of concerns without external UI frameworks |
| **Backend** | Node.js, Express.js | Modular RESTful API architecture with controllers, middleware, and routes |
| **Database** | MongoDB & Mongoose | Schemas for Users, Products, Carts, and Orders |
| **Authentication** | JWT (`jsonwebtoken`) & `bcryptjs` | Stateless token authentication and salt password encryption |
| **Configuration** | `dotenv` | Environment variables for ports, DB URIs, and JWT secrets |

---

## 📁 Project Structure

```
CodeAlpha_-Simple-E-commerce-Store/
├── backend/
│   ├── config/
│   │   ├── db.js                 # MongoDB connection manager with fail-fast timeouts
│   │   └── ensureDefaultUsers.js # Auto-seeds demo customer & admin accounts if database is fresh
│   ├── controllers/
│   │   ├── authController.js     # User registration, flexible login, profile retrieval & updates
│   │   ├── productController.js  # Catalog retrieval, search, category filter, sorting, details
│   │   ├── cartController.js     # MongoDB cart operations (get, add, update qty, remove, clear)
│   │   └── orderController.js    # Atomic stock deduction, rollback handler, order placement
│   ├── data/
│   │   └── productsData.js       # Seed catalog of 12 rich e-commerce products across 5 categories
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT verification (protect) and role-based checks (admin)
│   │   └── errorMiddleware.js    # Central 404 handler and Mongoose error formatter
│   ├── models/
│   │   ├── User.js               # User schema with bcrypt pre-save hook & matchPassword method
│   │   ├── Product.js            # Product schema with stock counters & category indices
│   │   ├── Cart.js               # Cart schema with calculateTotals() method
│   │   └── Order.js              # Order schema with shipping address, payment method & status
│   ├── routes/
│   │   ├── authRoutes.js         # /api/auth routes
│   │   ├── productRoutes.js      # /api/products routes
│   │   ├── cartRoutes.js         # /api/cart routes
│   │   └── orderRoutes.js        # /api/orders routes
│   ├── seeder.js                 # Database seeder script (npm run seed)
│   ├── server.js                 # Express server hosting REST API & static frontend
│   ├── .env.example              # Environment variables template (safe to commit)
│   ├── .gitignore                # Backend ignore rules (excludes .env & node_modules)
│   └── package.json              # Backend dependencies & scripts
│
├── frontend/
│   ├── index.html                # 1. Home Page (Hero, Categories, Featured Products)
│   ├── products.html             # 2. Product Catalog (Search, Category & Price filters)
│   ├── product-details.html      # 3. Product Details & Related Products
│   ├── cart.html                 # 4. Shopping Cart with server totals & promo codes
│   ├── login.html                # 5. User Login with 1-click Customer & Admin auto-fill
│   ├── register.html             # 6. User Registration
│   ├── checkout.html             # 7. Multi-step checkout with address & payment options
│   ├── orders.html               # 8. Order History tracking
│   ├── profile.html              # 9. User Profile & Account Settings
│   ├── css/
│   │   ├── style.css             # Unified Royal Blue design system & components
│   │   └── responsive.css        # Mobile & tablet breakpoints
│   └── js/
│       ├── api.js                # Central REST client (JWT Bearer injection & error handling)
│       ├── ui.js                 # Toast notifications, rating stars, cart badge, navbar auth
│       ├── home.js               # Featured products loader
│       ├── products.js           # Search, category filters & sort interactions
│       ├── product-details.js    # Product view & stock-bounded quantity selectors
│       ├── cart.js               # Cart item management & promo code logic
│       ├── checkout.js           # Form validation & order placement
│       ├── orders.js             # Order history rendering
│       ├── profile.js            # User profile viewer & live edit handler
│       └── auth.js               # Login & registration submit handlers
│
├── .gitignore                    # Git ignore file (excludes .env, node_modules, logs)
├── package.json                  # Root runner package.json
└── README.md                     # Comprehensive project documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **MongoDB** (Local MongoDB Community Server running on `mongodb://127.0.0.1:27017` **OR** a free [MongoDB Atlas](https://www.mongodb.com/atlas) connection URI)

### 2. Installation
Clone the repository and install backend dependencies:

```bash
git clone https://github.com/sudhir01082007/CodeAlpha_-Simple-E-commerce-Store.git
cd CodeAlpha_-Simple-E-commerce-Store/backend
npm install
```

### 3. Environment Configuration
Create a `.env` file in the `backend/` directory by copying `.env.example`:

```bash
cp .env.example .env
```

Default configuration (`backend/.env`):
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/codealpha_ecommerce
JWT_SECRET=codealpha_ecommerce_super_secure_jwt_secret_key_2026
```

> **Using MongoDB Atlas?** Replace `MONGODB_URI` with your connection string:
> `MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/codealpha_ecommerce?retryWrites=true&w=majority`

### 4. Seed the Database
Populate MongoDB with demo accounts and 12 sample products:

```bash
npm run seed
```

This creates:
- **Demo Customer**: `demo@codealpha.com` | Password: `password123`
- **Admin Manager**: `admin@codealpha.com` | Password: `admin123`
- **12 Curated Products** with prices, stock, ratings, and categories.

### 5. Run the Application
Start the backend server:

```bash
npm start
```

Or run with automatic reload during development:

```bash
npm run dev
```

### 6. Access in Browser
Open your browser and navigate to:
👉 **`http://localhost:5000`**

The Express backend simultaneously serves both the **REST API** (`/api/...`) and the **Frontend Web Store** on port 5000.

---

## 🔑 Default Credentials

| Role | Email / Username | Shorthand | Password |
|---|---|---|---|
| **Customer** | `demo@codealpha.com` | `demo` | `password123` |
| **Admin** | `admin@codealpha.com` | `admin` | `admin123` |

*(You can also use the 1-click **"👤 Auto-Fill Customer"** or **"🛡️ Auto-Fill Admin"** buttons directly on the Login page).*

---

## 📡 REST API Reference

### Authentication Endpoints (`/api/auth`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user with hashed password | Public |
| `POST` | `/api/auth/login` | Authenticate user (email or username) & return JWT token | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Private |
| `GET` | `/api/auth/profile` | Fetch user profile data | Private |
| `PUT` | `/api/auth/profile` | Update profile display name and email | Private |

### Products Endpoints (`/api/products`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/products` | Get products (supports `keyword`, `category`, `sort`, `minPrice`, `maxPrice`) | Public |
| `GET` | `/api/products/featured` | Fetch top featured products for homepage | Public |
| `GET` | `/api/products/categories` | Get unique categories list | Public |
| `GET` | `/api/products/:id` | Fetch single product and related items | Public |

### Cart Endpoints (`/api/cart`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/cart` | Get current user's MongoDB cart | Private |
| `POST` | `/api/cart` | Add product to cart with stock validation | Private |
| `PUT` | `/api/cart/:productId` | Update item quantity | Private |
| `DELETE` | `/api/cart/:productId` | Remove item from cart | Private |
| `DELETE` | `/api/cart` | Clear entire cart | Private |

### Order Endpoints (`/api/orders`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/orders` | Place order, decrement inventory atomically, clear cart | Private |
| `GET` | `/api/orders/myorders` | Get logged-in user's order history | Private |
| `GET` | `/api/orders/:id` | Get individual order details | Private |

---

## 🧪 Testing the Complete Workflow

1. Open **`http://localhost:5000`**.
2. Click **Log In** in the top navbar and click the **"👤 Auto-Fill Customer"** button, then click **Sign In**.
3. Browse products on the **Home** page or navigate to **Shop Products**.
4. Test real-time search (e.g., type `"Sony"` or `"Watch"`).
5. Filter by category (e.g., click **"Electronics"** or **"Fashion"**).
6. Click on a product to view the **Product Details** page. Select quantity and click **Add to Cart**.
7. Go to **Cart** via the navbar icon. Test increasing quantity, entering promo code `ALPHA2026` for a 10% discount, or removing an item.
8. Click **Proceed to Checkout**, fill in your shipping address, choose **Cash on Delivery**, and click **Confirm & Place Order**.
9. You will be redirected to **My Orders** with a celebration banner, where your newly placed order is permanently saved in MongoDB!

---

## 🎓 Internship Submission Details
- **Internship**: Full Stack Web Development
- **Organization**: CodeAlpha
- **Project**: CodeAlpha Simple E-Commerce Store
- **Repository**: [https://github.com/sudhir01082007/CodeAlpha_-Simple-E-commerce-Store](https://github.com/sudhir01082007/CodeAlpha_-Simple-E-commerce-Store)
