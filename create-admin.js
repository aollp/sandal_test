const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// User 모델 로드
require('./models/User');
const User = mongoose.model('User');

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sandeul_networks')
  .then(async () => {
    console.log('MongoDB 연결 성공');
    
    // 관리자 계정 생성
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    const admin = new User({
      username: 'admin',
      email: 'admin@sandeul.co.kr',
      password: hashedPassword,
      name: '관리자',
      role: 'admin'
    });
    
    try {
      await admin.save();
      console.log('관리자 계정이 성공적으로 생성되었습니다.');
      console.log('로그인 정보: 아이디 - admin, 비밀번호 - admin123');
    } catch (error) {
      console.error('관리자 계정 생성 오류:', error);
    }
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('MongoDB 연결 오류:', err);
  });