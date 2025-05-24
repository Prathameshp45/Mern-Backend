import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  itemCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  itemDescription: {
    type: String,
    required: true,
    trim: true
  },
  unit: {
    type: String,
    required: true,
    trim: true
  },
  mrp: {
    type: Number,
    required: true,
    min: 0
  },
  dp: {
    type: Number,
    required: true,
    min: 0
  },
  nlc: {
    type: Number,
    required: true,
    min: 0
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Product = mongoose.model('Product', productSchema);

export default Product;
