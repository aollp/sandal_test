const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const Product = mongoose.model('Product');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// 파일 업로드 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/products/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'product-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|zip/;
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (allowedTypes.test(ext.substring(1))) {
            cb(null, true);
        } else {
            cb(new Error('지원하지 않는 파일 형식입니다.'));
        }
    }
});

// 모든 제품 조회
router.get('/', async (req, res) => {
    try {
        const products = await Product.find({ isActive: true });
        res.json(products);
    } catch (error) {
        console.error('제품 조회 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 특정 제품 조회
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ error: '제품을 찾을 수 없습니다.' });
        }
        
        res.json(product);
    } catch (error) {
        console.error('제품 조회 오류:', error);
        
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ error: '제품을 찾을 수 없습니다.' });
        }
        
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 제품 생성 (관리자 전용)
router.post('/', requireAuth, requireAdmin, upload.array('images', 5), async (req, res) => {
    try {
        const { name, brand, category, description, features, specifications, externalLink, displayOrder } = req.body;
        
        if (!name || !brand || !category || !description) {
            return res.status(400).json({ error: '모든 필수 필드를 입력해주세요.' });
        }
        
        // 이미지 처리
        let images = [];
        if (req.files && req.files.length > 0) {
            images = req.files.map(file => ({
                path: '/uploads/products/' + file.filename,
                alt: name
            }));
        }
        
        // specifications 처리
        let parsedSpecifications = [];
        if (specifications) {
            try {
                parsedSpecifications = JSON.parse(specifications);
            } catch (error) {
                console.error('specifications 파싱 오류:', error);
            }
        }
        
        // features 처리
        let parsedFeatures = [];
        if (features) {
            try {
                parsedFeatures = JSON.parse(features);
            } catch (error) {
                console.error('features 파싱 오류:', error);
                parsedFeatures = features.split(',').map(feature => feature.trim());
            }
        }
        
        const product = new Product({
            name,
            brand,
            category,
            description,
            features: parsedFeatures,
            specifications: parsedSpecifications,
            images,
            externalLink,
            displayOrder: displayOrder || 0,
            isActive: true
        });
        
        await product.save();
        
        res.status(201).json({
            success: true,
            product
        });
    } catch (error) {
        console.error('제품 생성 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 제품 수정 (관리자 전용)
router.put('/:id', requireAuth, requireAdmin, upload.array('images', 5), async (req, res) => {
    try {
        const { name, brand, category, description, features, specifications, externalLink, displayOrder, isActive, keepImages } = req.body;
        
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ error: '제품을 찾을 수 없습니다.' });
        }
        
        // 이미지 처리
        let updatedImages = [];
        
        if (keepImages && Array.isArray(JSON.parse(keepImages))) {
            const keepImageIds = JSON.parse(keepImages);
            updatedImages = product.images.filter((_, index) => keepImageIds.includes(index.toString()));
        }
        
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => ({
                path: '/uploads/products/' + file.filename,
                alt: name || product.name
            }));
            
            updatedImages = [...updatedImages, ...newImages];
        }
        
        // specifications 처리
        let parsedSpecifications = product.specifications;
        if (specifications) {
            try {
                parsedSpecifications = JSON.parse(specifications);
            } catch (error) {
                console.error('specifications 파싱 오류:', error);
            }
        }
        
        // features 처리
        let parsedFeatures = product.features;
        if (features) {
            try {
                parsedFeatures = JSON.parse(features);
            } catch (error) {
                console.error('features 파싱 오류:', error);
                parsedFeatures = features.split(',').map(feature => feature.trim());
            }
        }
        
        // 제품 업데이트
        product.name = name || product.name;
        product.brand = brand || product.brand;
        product.category = category || product.category;
        product.description = description || product.description;
        product.features = parsedFeatures;
        product.specifications = parsedSpecifications;
        product.images = updatedImages;
        product.externalLink = externalLink !== undefined ? externalLink : product.externalLink;
        product.displayOrder = displayOrder !== undefined ? displayOrder : product.displayOrder;
        product.isActive = isActive !== undefined ? isActive === 'true' : product.isActive;
        
        await product.save();
        
        res.json({
            success: true,
            product
        });
    } catch (error) {
        console.error('제품 수정 오류:', error);
        
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ error: '제품을 찾을 수 없습니다.' });
        }
        
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 제품 삭제 (관리자 전용)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ error: '제품을 찾을 수 없습니다.' });
        }
        
        await product.remove();
        
        res.json({
            success: true,
            message: '제품이 성공적으로 삭제되었습니다.'
        });
    } catch (error) {
        console.error('제품 삭제 오류:', error);
        
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ error: '제품을 찾을 수 없습니다.' });
        }
        
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;