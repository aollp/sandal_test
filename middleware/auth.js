const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = mongoose.model('User');

// 미들웨어: 로그인 여부 확인
const requireAuth = async (req, res, next) => {
    try {
        const { authorization } = req.headers;
        
        if (!authorization) {
            return res.status(401).json({ error: '로그인이 필요합니다.' });
        }
        
        const token = authorization.replace('Bearer ', '');
        
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'sandeul-jwt-secret');
        const { userId } = payload;
        
        const user = await User.findById(userId);
        
        if (!user || !user.isActive) {
            return res.status(401).json({ error: '사용자를 찾을 수 없거나 비활성화되었습니다.' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        console.error('인증 오류:', error);
        return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
    }
};

// 미들웨어: 관리자 여부 확인
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: '접근 권한이 없습니다.' });
    }
    next();
};

module.exports = { requireAuth, requireAdmin };