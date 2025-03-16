const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const dotenv = require('dotenv');
const morgan = require('morgan');

// 환경 설정 파일 로드
dotenv.config();

// Express 애플리케이션 생성
const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));

// 세션 설정
app.use(session({
    secret: process.env.SESSION_SECRET || 'sandeul-session-secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/sandeul_networks'
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // 24시간
    }
}));

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

// 파일 업로드 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = 'public/uploads/';
        
        // 파일 타입에 따라 업로드 경로 변경
        if (file.mimetype.startsWith('image/')) {
            uploadPath += 'images/';
        } else if (file.mimetype === 'application/pdf') {
            uploadPath += 'documents/';
        } else {
            uploadPath += 'files/';
        }
        
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB 제한
    },
    fileFilter: (req, file, cb) => {
        // 허용할 파일 타입 설정
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|zip/;
        const ext = path.extname(file.originalname).toLowerCase();
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && allowedTypes.test(ext.substring(1))) {
            return cb(null, true);
        } else {
            cb(new Error('지원하지 않는 파일 형식입니다.'));
        }
    }
});

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sandeul_networks')
    .then(() => console.log('MongoDB 연결 성공'))
    .catch(err => console.error('MongoDB 연결 오류:', err));

// 모델 로드
require('./models/User');
require('./models/Notice');
require('./models/Product');
require('./models/Contact');
require('./models/Setting');

// 라우트 로드
const authRoutes = require('./routes/auth');
const noticeRoutes = require('./routes/notice');
const productRoutes = require('./routes/product');
const contactRoutes = require('./routes/contact');
const adminRoutes = require('./routes/admin');
const settingRoutes = require('./routes/setting');

// API 라우트 설정
app.use('/api/auth', authRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingRoutes);

// 파일 업로드 API
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: '파일이 업로드되지 않았습니다.' });
    }
    
    // 파일 경로를 상대 경로로 변환
    const filePath = req.file.path.replace('public/', '/');
    
    res.status(200).json({
        success: true,
        data: {
            filename: req.file.filename,
            originalname: req.file.originalname,
            path: filePath,
            size: req.file.size
        }
    });
});

// 모든 다른 요청은 프론트엔드로 라우팅 (SPA 지원)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 에러 핸들러
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    res.status(err.status || 500).json({
        success: false,
        message: err.message || '서버 오류가 발생했습니다.',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});