const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const Notice = mongoose.model('Notice');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// 파일 업로드 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/notices/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'notice-' + uniqueSuffix + ext);
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

// 모든 공지사항 조회 (페이징, 필터링, 정렬 지원)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const query = {};
        
        // 카테고리 필터링
        if (req.query.category) {
            query.category = req.query.category;
        }
        
        // 공개 상태 필터링 (기본값: 공개된 공지만 표시)
        query.isPublished = req.query.isPublished ? req.query.isPublished === 'true' : true;
        
        // 검색어 처리
        if (req.query.search) {
            query.$text = { $search: req.query.search };
        }
        
        // 정렬 방식
        const sort = {};
        if (req.query.sort) {
            const sortField = req.query.sort;
            sort[sortField] = req.query.order === 'asc' ? 1 : -1;
        } else {
            // 기본 정렬: 중요 공지 우선, 그 다음 최신순
            sort.isImportant = -1;
            sort.createdAt = -1;
        }
        
        const notices = await Notice.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate('author', 'name');
        
        const totalNotices = await Notice.countDocuments(query);
        const totalPages = Math.ceil(totalNotices / limit);
        
        res.json({
            notices,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: totalNotices,
                limit
            }
        });
    } catch (error) {
        console.error('공지사항 조회 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 나머지 API 엔드포인트들...

module.exports = router;