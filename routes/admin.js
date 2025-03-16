const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const Notice = mongoose.model('Notice');
const Product = mongoose.model('Product');
const Contact = mongoose.model('Contact');
const User = mongoose.model('User');

// 대시보드 통계
router.get('/dashboard', requireAuth, async (req, res) => {
    try {
        // 각 모델의 데이터 개수 집계
        const noticeCount = await Notice.countDocuments();
        const productCount = await Product.countDocuments();
        const contactCount = await Contact.countDocuments();
        const newContactCount = await Contact.countDocuments({ isRead: false });
        
        // 최근 공지사항
        const recentNotices = await Notice.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('author', 'name');
        
        // 최근 문의
        const recentContacts = await Contact.find()
            .sort({ createdAt: -1 })
            .limit(5);
        
        res.json({
            stats: {
                noticeCount,
                productCount,
                contactCount,
                newContactCount
            },
            recentNotices,
            recentContacts
        });
    } catch (error) {
        console.error('대시보드 데이터 조회 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 관리자 권한 체크
router.get('/check-admin', requireAuth, requireAdmin, (req, res) => {
    res.json({
        success: true,
        isAdmin: true
    });
});

// 일괄 작업 처리 (공지사항)
router.post('/notices/bulk', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { action, ids } = req.body;
        
        if (!action || !ids || !Array.isArray(ids)) {
            return res.status(400).json({ error: '올바른 요청이 아닙니다.' });
        }
        
        let result;
        
        switch (action) {
            case 'publish':
                result = await Notice.updateMany(
                    { _id: { $in: ids } },
                    { $set: { isPublished: true } }
                );
                break;
            case 'unpublish':
                result = await Notice.updateMany(
                    { _id: { $in: ids } },
                    { $set: { isPublished: false } }
                );
                break;
            case 'delete':
                result = await Notice.deleteMany({ _id: { $in: ids } });
                break;
            default:
                return res.status(400).json({ error: '지원하지 않는 작업입니다.' });
        }
        
        res.json({
            success: true,
            message: `${ids.length}개의 항목에 대해 작업이 완료되었습니다.`,
            result
        });
    } catch (error) {
        console.error('일괄 작업 처리 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 일괄 작업 처리 (제품)
router.post('/products/bulk', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { action, ids } = req.body;
        
        if (!action || !ids || !Array.isArray(ids)) {
            return res.status(400).json({ error: '올바른 요청이 아닙니다.' });
        }
        
        let result;
        
        switch (action) {
            case 'activate':
                result = await Product.updateMany(
                    { _id: { $in: ids } },
                    { $set: { isActive: true } }
                );
                break;
            case 'deactivate':
                result = await Product.updateMany(
                    { _id: { $in: ids } },
                    { $set: { isActive: false } }
                );
                break;
            case 'delete':
                result = await Product.deleteMany({ _id: { $in: ids } });
                break;
            default:
                return res.status(400).json({ error: '지원하지 않는 작업입니다.' });
        }
        
        res.json({
            success: true,
            message: `${ids.length}개의 항목에 대해 작업이 완료되었습니다.`,
            result
        });
    } catch (error) {
        console.error('일괄 작업 처리 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 일괄 작업 처리 (문의)
router.post('/contacts/bulk', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { action, ids, status, assignedTo } = req.body;
        
        if (!action || !ids || !Array.isArray(ids)) {
            return res.status(400).json({ error: '올바른 요청이 아닙니다.' });
        }
        
        let result;
        
        switch (action) {
            case 'status':
                if (!status || !['new', 'in-progress', 'completed'].includes(status)) {
                    return res.status(400).json({ error: '유효한 상태를 입력해주세요.' });
                }
                
                result = await Contact.updateMany(
                    { _id: { $in: ids } },
                    { $set: { status } }
                );
                break;
            case 'assign':
                result = await Contact.updateMany(
                    { _id: { $in: ids } },
                    { $set: { assignedTo: assignedTo || null } }
                );
                break;
            case 'markRead':
                result = await Contact.updateMany(
                    { _id: { $in: ids } },
                    { $set: { isRead: true } }
                );
                break;
            case 'markUnread':
                result = await Contact.updateMany(
                    { _id: { $in: ids } },
                    { $set: { isRead: false } }
                );
                break;
            case 'delete':
                result = await Contact.deleteMany({ _id: { $in: ids } });
                break;
            default:
                return res.status(400).json({ error: '지원하지 않는 작업입니다.' });
        }
        
        res.json({
            success: true,
            message: `${ids.length}개의 항목에 대해 작업이 완료되었습니다.`,
            result
        });
    } catch (error) {
        console.error('일괄 작업 처리 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;