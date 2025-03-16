const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = mongoose.model('User');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// 로그인
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: '사용자 이름과 비밀번호를 입력해주세요.' });
        }
        
        const user = await User.findOne({ username });
        
        if (!user) {
            return res.status(401).json({ error: '사용자 이름 또는 비밀번호가 올바르지 않습니다.' });
        }
        
        if (!user.isActive) {
            return res.status(401).json({ error: '비활성화된 계정입니다. 관리자에게 문의하세요.' });
        }
        
        const isMatch = await user.comparePassword(password);
        
        if (!isMatch) {
            return res.status(401).json({ error: '사용자 이름 또는 비밀번호가 올바르지 않습니다.' });
        }
        
        // 마지막 로그인 시간 업데이트
        user.lastLogin = new Date();
        await user.save();
        
        // JWT 토큰 생성
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'sandeul-jwt-secret', {
            expiresIn: '1d'
        });
        
        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('로그인 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 현재 로그인한 사용자 정보 확인
router.get('/me', requireAuth, (req, res) => {
    res.json({
        id: req.user._id,
        username: req.user.username,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
    });
});

// 비밀번호 변경
router.post('/change-password', requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' });
        }
        
        const user = await User.findById(req.user._id);
        const isMatch = await user.comparePassword(currentPassword);
        
        if (!isMatch) {
            return res.status(401).json({ error: '현재 비밀번호가 올바르지 않습니다.' });
        }
        
        user.password = newPassword;
        await user.save();
        
        res.json({ success: true, message: '비밀번호가 성공적으로 변경되었습니다.' });
    } catch (error) {
        console.error('비밀번호 변경 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 사용자 생성 (관리자 전용)
router.post('/users', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { username, email, password, name, role } = req.body;
        
        if (!username || !email || !password || !name) {
            return res.status(400).json({ error: '모든 필수 필드를 입력해주세요.' });
        }
        
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        
        if (existingUser) {
            return res.status(400).json({ error: '이미 사용 중인 사용자 이름 또는 이메일입니다.' });
        }
        
        const user = new User({
            username,
            email,
            password,
            name,
            role: role || 'editor'
        });
        
        await user.save();
        
        res.status(201).json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('사용자 생성 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 다른 사용자 관리 API 엔드포인트들...

module.exports = router;