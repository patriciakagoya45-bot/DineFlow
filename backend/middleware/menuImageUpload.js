const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadsDirectory = path.join(__dirname, '../../frontend/uploads');
fs.mkdirSync(uploadsDirectory, { recursive: true });

const extensionsByMimeType = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif'
};

const upload = multer({
    storage: multer.diskStorage({
        destination: uploadsDirectory,
        filename(req, file, callback) {
            callback(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extensionsByMimeType[file.mimetype]}`);
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter(req, file, callback) {
        if (!extensionsByMimeType[file.mimetype]) {
            return callback(new Error('Upload a JPG, PNG, WEBP, or GIF image.'));
        }
        callback(null, true);
    }
});

function uploadMenuImage(req, res) {
    upload.single('image')(req, res, error => {
        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Choose an image to upload.' });
        }
        res.status(201).json({
            success: true,
            data: { image: `/uploads/${req.file.filename}` }
        });
    });
}

module.exports = uploadMenuImage;