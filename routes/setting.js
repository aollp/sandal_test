const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Setting = mongoose.model('Setting');

// 파일 업로드 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/settings/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'setting-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|svg|ico/;
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (allowedTypes.test(ext.substring(1))) {
            cb(null, true);
        } else {
            cb(new Error('지원하지 않는 파일 형식입니다. 이미지 파일만 업로드 가능합니다.'));
        }
    }
});

// 모든 설정 가져오기
router.get('/', async (req, res) => {
    try {
        const settings = await Setting.find();
        
        // 결과를 객체로 변환
        const result = settings.reduce((acc, setting) => {
            acc[setting.type] = setting.data;
            return acc;
        }, {});
        
        res.json(result);
    } catch (error) {
        console.error('설정 조회 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 특정 설정 가져오기
router.get('/:type', async (req, res) => {
    try {
        const { type } = req.params;
        
        const setting = await Setting.findOne({ type });
        
        if (!setting) {
            return res.status(404).json({ error: '설정을 찾을 수 없습니다.' });
        }
        
        res.json(setting.data);
    } catch (error) {
        console.error('설정 조회 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 설정 업데이트 (관리자 전용)
router.put('/:type', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { type } = req.params;
        const data = req.body;
        
        if (!data) {
            return res.status(400).json({ error: '설정 데이터가 없습니다.' });
        }
        
        let setting = await Setting.findOne({ type });
        
        if (!setting) {
            // 설정이 없으면 새로 생성
            setting = new Setting({
                type,
                data,
                updatedBy: req.user._id
            });
        } else {
            // 기존 설정 업데이트
            setting.data = data;
            setting.updatedBy = req.user._id;
        }
        
        await setting.save();
        
        res.json({
            success: true,
            setting
        });
    } catch (error) {
        console.error('설정 업데이트 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 로고 또는 파비콘 업로드 (관리자 전용)
router.post('/upload/:fileType', requireAuth, requireAdmin, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
        }
        
        const { fileType } = req.params;
        
        if (!['logo', 'favicon', 'logoWhite'].includes(fileType)) {
            return res.status(400).json({ error: '지원하지 않는 파일 타입입니다.' });
        }
        
        // 파일 경로를 상대 경로로 변환
        const filePath = req.file.path.replace('public', '');
        
        res.json({
            success: true,
            filePath,
            fileType
        });
    } catch (error) {
        console.error('파일 업로드 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 메뉴 설정 업데이트 (관리자 전용)
router.put('/menu/update', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { menus } = req.body;
        
        if (!menus || !Array.isArray(menus)) {
            return res.status(400).json({ error: '올바른 메뉴 데이터가 아닙니다.' });
        }
        
        let setting = await Setting.findOne({ type: 'general' });
        
        if (!setting) {
            // 설정이 없으면 새로 생성
            setting = new Setting({
                type: 'general',
                data: { menus },
                updatedBy: req.user._id
            });
        } else {
            // 기존 설정 업데이트
            setting.data.menus = menus;
            setting.updatedBy = req.user._id;
        }
        
        await setting.save();
        
        res.json({
            success: true,
            menus
        });
    } catch (error) {
        console.error('메뉴 설정 업데이트 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;