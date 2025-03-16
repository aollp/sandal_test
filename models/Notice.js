const mongoose = require('mongoose');

const NoticeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    category: {
        type: String,
        enum: ['general', 'press', 'financial', 'product', 'event'],
        default: 'general'
    },
    isImportant: {
        type: Boolean,
        default: false
    },
    attachments: [{
        filename: String,
        originalname: String,
        path: String,
        size: Number
    }],
    viewCount: {
        type: Number,
        default: 0
    },
    isPublished: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Virtual for ID formatting
NoticeSchema.virtual('formattedId').get(function() {
    const year = this.createdAt.getFullYear();
    return `${year}-${this._id.toString().slice(-6)}`;
});

// 검색을 위한 인덱스 생성
NoticeSchema.index({ title: 'text', content: 'text' });

module.exports = mongoose.model('Notice', NoticeSchema);