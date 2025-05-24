import Product from '../models/Product.js';
import multer from 'multer';
import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up multer storage for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

// File filter to only accept Excel files
// File filter to accept all Excel file types
const fileFilter = (req, file, cb) => {
    // Check file extension
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExt = path.extname(file.originalname).toLowerCase();

    // Check MIME type
    const allowedMimeTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/octet-stream',
        'application/excel',
        'application/x-excel',
        'application/x-msexcel',
        'text/csv'
    ];

    if (allowedExtensions.includes(fileExt) || allowedMimeTypes.includes(file.mimetype)) {
        return cb(null, true);
    } else {
        console.log(`Rejected file: ${file.originalname}, mimetype: ${file.mimetype}`);
        cb(new Error(`Only Excel files are allowed! Received mimetype: ${file.mimetype}`));
    }
};


// Initialize upload middleware
const upload = multer({ 
    storage: storage,
    // Remove the fileFilter line
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  }).single('excelFile');
  
// Get all products
export const getAllProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get single product
export const getProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// Add product
export const addProduct = async (req, res) => {
    try {
        const { itemCode, itemDescription, unit, mrp, dp, nlc, percentage } = req.body;

        // Check if product with the same item code already exists
        const existingProduct = await Product.findOne({ itemCode });
        if (existingProduct) {
            return res.status(400).json({
                success: false,
                error: 'Product with this item code already exists'
            });
        }

        const product = await Product.create(req.body);

        res.status(201).json({
            success: true,
            data: product
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                error: messages
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Server Error'
            });
        }
    }
};

// Update product
export const updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        // If itemCode is being updated, check if it already exists
        if (req.body.itemCode && req.body.itemCode !== product.itemCode) {
            const existingProduct = await Product.findOne({ itemCode: req.body.itemCode });
            if (existingProduct) {
                return res.status(400).json({
                    success: false,
                    error: 'Product with this item code already exists'
                });
            }
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            data: updatedProduct
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                error: messages
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Server Error'
            });
        }
    }
};

// Delete product
export const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        await Product.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// Import products from Excel file
// Import products from Excel file
export const importProductsFromExcel = async (req, res) => {
    upload(req, res, async function(err) {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        return res.status(400).json({
          success: false,
          error: `Multer upload error: ${err.message}`
        });
      } else if (err) {
        // An unknown error occurred
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }
  
      // If no file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Please upload an Excel file'
        });
      }
  
      console.log('File received:', {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });
  
      try {
        // Read the Excel file
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);
  
        if (data.length === 0) {
          // Delete the uploaded file
          fs.unlinkSync(req.file.path);
          
          return res.status(400).json({
            success: false,
            error: 'Excel file is empty'
          });
        }
  
        // Validate and prepare data
        const productsToInsert = [];
        const skippedProducts = [];
        const errors = [];
  
        // First, collect all item codes from the Excel file
        const excelItemCodes = data.map(item => item.itemCode || item['Item Code']);
        
        // Check which item codes already exist in the database
        const existingProducts = await Product.find({
          itemCode: { $in: excelItemCodes }
        });
        
        const existingItemCodesInDB = new Set(existingProducts.map(p => p.itemCode));
        const existingItemCodes = new Set();
  
        // Process each row
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          
          // Map Excel columns to product fields (handle different possible column names)
          const product = {
            itemCode: row.itemCode || row['Item Code'],
            itemDescription: row.itemDescription || row['Item Description'],
            unit: row.unit || row['Unit'],
            mrp: parseFloat(row.mrp || row['MRP'] || 0),
            dp: parseFloat(row.dp || row['DP'] || 0),
            nlc: parseFloat(row.nlc || row['NLC'] || 0),
            percentage: parseFloat(row.percentage || row['Percentage'] || 0)
          };
  
          // Validate required fields
          if (!product.itemCode) {
            errors.push(`Row ${i + 1}: Item Code is required`);
            continue;
          }
  
          // Check for duplicate item codes within the Excel file
          if (existingItemCodes.has(product.itemCode)) {
            skippedProducts.push({
              itemCode: product.itemCode,
              reason: 'Duplicate in Excel file'
            });
            continue;
          }
  
          // Check if item code already exists in the database
          if (existingItemCodesInDB.has(product.itemCode)) {
            skippedProducts.push({
              itemCode: product.itemCode,
              reason: 'Already exists in database'
            });
            continue;
          }
  
          // Add to set to check for duplicates in subsequent rows
          existingItemCodes.add(product.itemCode);
          
          // Validate numeric fields
          if (isNaN(product.mrp) || product.mrp < 0) {
            errors.push(`Row ${i + 1}: Invalid MRP value`);
            continue;
          }
          
          if (isNaN(product.dp) || product.dp < 0) {
            errors.push(`Row ${i + 1}: Invalid DP value`);
            continue;
          }
          
          if (isNaN(product.nlc) || product.nlc < 0) {
            errors.push(`Row ${i + 1}: Invalid NLC value`);
            continue;
          }
          
          if (isNaN(product.percentage) || product.percentage < 0 || product.percentage > 100) {
            errors.push(`Row ${i + 1}: Invalid Percentage value (must be between 0 and 100)`);
            continue;
          }
  
          // If all validations pass, add to products array
          productsToInsert.push(product);
        }
  
        // Delete the uploaded file
        fs.unlinkSync(req.file.path);
  
        // If there are validation errors, return them
        if (errors.length > 0 && productsToInsert.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Validation errors in Excel file',
            details: errors
          });
        }
  
        // Insert all valid products
        let insertedProducts = [];
        if (productsToInsert.length > 0) {
          insertedProducts = await Product.insertMany(productsToInsert, { ordered: false })
            .catch(err => {
              // If some inserts fail due to duplicates, we'll still get the successful ones
              if (err.writeErrors) {
                return err.insertedDocs || [];
              }
              throw err;
            });
        }
  
        res.status(200).json({
          success: true,
          count: insertedProducts.length,
          data: insertedProducts,
          skipped: skippedProducts.length,
          skippedDetails: skippedProducts,
          errors: errors.length > 0 ? errors : undefined
        });
      } catch (error) {
        console.error('Error processing Excel file:', error);
        
        // Delete the uploaded file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
          success: false,
          error: 'Error processing Excel file',
          details: error.message
        });
      }
    });
  };
  

