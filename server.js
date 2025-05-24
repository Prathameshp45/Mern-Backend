import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import productRoutes from './routes/productRoutes.js';
import userRoutes from './routes/userRoutes.js';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
mongoose.connect('mongodb+srv://prathameshp9456:x7h0rGSFB4Sk3Ptq@cluster0.mxihygn.mongodb.net/BalajiElectronics')
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB connection error:", err));


app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(500).json({ message: 'Server error',error:error });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
