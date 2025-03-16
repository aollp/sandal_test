const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    brand: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    features: [String],
    specifications: [{
        name: String,
        value: String
    }],
    logo: {
        path: String,
        alt: String
    },
    images: [{
        path: String,
        alt: String
    }],
    documents: [{
        name: String,
        path: String,
        type: String
    }],
    externalLink: String,
    displayOrder: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);