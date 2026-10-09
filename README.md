# Assignment 3 - Inventory and Data Management System

Web Dev III | Unit 3 | CO3

## Tech Stack
- Node.js
- Express.js
- MongoDB
- Mongoose
- dotenv

## Setup

1. Open this folder in VS Code.
2. Open terminal:
   ```bash
   npm install
   ```
3. Create a file named `.env` in the project root and add:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/inventory_db
   ```
   If using MongoDB Atlas, replace `MONGO_URI` with the Atlas connection string.
4. Start MongoDB if using local MongoDB.
5. Run:
   ```bash
   npm start
   ```
6. Test: `GET http://localhost:5000/`

## API Endpoints

### Product CRUD
- `POST /api/products` - Create product
- `GET /api/products` - Get products with filtering/sorting/pagination
- `GET /api/products/:id` - Get one product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Stock
- `PATCH /api/products/:id/restock` - Increase stock
- `PATCH /api/products/:id/sale` - Decrease stock safely

### Reports
- `GET /api/products/reports/low-stock` - Low-stock report
- `GET /api/products/reports/low-stock?threshold=10` - Custom threshold
- `GET /api/products/reports/category-summary` - Category-wise aggregation

## Query Examples

`GET /api/products?category=Electronics&page=1&limit=5&sort=-price`

`GET /api/products?search=phone&minPrice=500&maxPrice=50000`

`GET /api/products?minStock=1&maxStock=20&sort=stock`

## Sample Product JSON

```json
{
  "name": "Wireless Mouse",
  "category": "Electronics",
  "price": 799,
  "stock": 20,
  "lowStockThreshold": 5,
  "description": "2.4 GHz wireless mouse"
}
```
