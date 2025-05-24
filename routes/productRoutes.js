import express from 'express';
import { 
  getAllProducts, 
  getProduct, 
  addProduct, 
  updateProduct, 
  deleteProduct,
  importProductsFromExcel
} from '../controllers/productController.js';

const router = express.Router();

// Get all products and add a new product
router
  .route('/')
  .get(getAllProducts)
  .post(addProduct);

// Import products from Excel file
router.post('/import-excel', importProductsFromExcel);

// Get, update and delete a specific product
router
  .route('/:id')
  .get(getProduct)
  .put(updateProduct)
  .delete(deleteProduct);

export default router;
