const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const Contact = mongoose.model('Contact');
const { requireAuth } = require('../middleware/auth');

// 파일 업로드 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/contacts/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'contact-' + uniqueSuffix + ext);
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

// 문의 생성
router.post('/', upload.array('attachments', 3), async (req, res) => {
    try {
        const { name, email, phone, company, subject, message } = req.body;
        
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ error: '모든 필수 필드를 입력해주세요.' });
        }
        
        // 첨부 파일 처리
        const attachments = req.files ? req.files.map(file => ({
            filename: file.filename,
            originalname: file.originalname,
            path: '/uploads/contacts/' + file.filename,
            size: file.size
        })) : [];
        
        const contact = new Contact({
            name,
            email,
            phone,
            company,
            subject,
            message,
            attachments,
            status: 'new',
            isRead: false
        });
        
        await contact.save();
        
        // 이메일 발송 로직 (생략)
        
        res.status(201).json({
            success: true,
            message: '문의가 성공적으로 접수되었습니다.'
        });
    } catch (error) {
        console.error('문의 접수 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 문의 목록 조회 (관리자 전용)
router.get('/', requireAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const query = {};
        
        // 상태 필터링
        if (req.query.status) {
            query.status = req.query.status;
        }
        
        // 검색어 처리
        if (req.query.search) {
            query.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { email: { $regex: req.query.search, $options: 'i' } },
                { subject: { $regex: req.query.search, $options: 'i' } },
                { message: { $regex: req.query.search, $options: 'i' } }
            ];
        }
        
        // 정렬 방식
        const sort = {};
        if (req.query.sort) {
            const sortField = req.query.sort;
            sort[sortField] = req.query.order === 'asc' ? 1 : -1;
        } else {
            // 기본 정렬: 최신순
            sort.createdAt = -1;
        }
        
        const contacts = await Contact.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate('assignedTo', 'name');
        
        const totalContacts = await Contact.countDocuments(query);
        const totalPages = Math.ceil(totalContacts / limit);
        
        res.json({
            contacts,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: totalContacts,
                limit
            }
        });
    } catch (error) {
        console.error('문의 목록 조회 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 문의 상세 조회 (관리자 전용)
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id)
            .populate('assignedTo', 'name')
            .populate('responses.createdBy', 'name');
        
        if (!contact) {
            return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });
        }
        
        // 읽음 상태 업데이트
        if (!contact.isRead) {
            contact.isRead = true;
            await contact.save();
        }
        
        res.json(contact);
    } catch (error) {
        console.error('문의 조회 오류:', error);
        
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });
        }
        
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 문의 상태 업데이트 (관리자 전용)
router.patch('/:id/status', requireAuth, async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!status || !['new', 'in-progress', 'completed'].includes(status)) {
            return res.status(400).json({ error: '유효한 상태를 입력해주세요.' });
        }
        
        const contact = await Contact.findById(req.params.id);
        
        if (!contact) {
            return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });
        }
        
        contact.status = status;
        await contact.save();
        
        res.json({
            success: true,
            contact
        });
    } catch (error) {
        console.error('문의 상태 업데이트 오류:', error);
        
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });
        }
        
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 문의 담당자 할당 (관리자 전용)
router.patch('/:id/assign', requireAuth, async (req, res) => {
    try {
        const { assignedTo } = req.body;
        
        const contact = await Contact.findById(req.params.id);
        
        if (!contact) {
            return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });
        }
        
        contact.assignedTo = assignedTo || null;
        await contact.save();
        
        res.json({
            success: true,
            contact: await contact.populate('assignedTo', 'name')
        });
    } catch (error) {
        console.error('문의 담당자 할당 오류:', error);
        
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });
        }
        
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 문의 응답 추가 (관리자 전용)
router.post('/:id/responses', requireAuth, async (req, res) => {
    try {
        const { content } = req.body;
        
        if (!content) {
            return res.status(400).json({ error: '응답 내용을 입력해주세요.' });
        }
        
        const contact = await Contact.findById(req.params.id);
        
        if (!contact) {
            return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });
        }
        
        contact.responses.push({
            content,
            createdBy: req.user._id
        });
        
        await contact.save();
        
        res.json({
            success: true,
            contact: await contact.populate('responses.createdBy', 'name')
        });
    } catch (error) {
        console.error('문의 응답 추가 오류:', error);
        
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });
        }
        
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;