
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
    },
    fileFilter(req, file, callback) {
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return callback(
                new Error('Upload a JPG, PNG, WEBP, or GIF image.')
            );
        }

        callback(null, true);
    }
});

function uploadToCloudinary(buffer) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: 'dineflow/menu-items',
                resource_type: 'image'
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }

                resolve(result);
            }
        );

        Readable.from(buffer).pipe(stream);
    });
}

function uploadMenuImage(req, res) {
    upload.single('image')(req, res, async error => {
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Choose an image to upload.'
            });
        }

        try {
            const result = await uploadToCloudinary(req.file.buffer);

            return res.status(201).json({
                success: true,
                data: {
                    image: result.secure_url,
                    publicId: result.public_id
                }
            });

        } catch (uploadError) {
            console.error(
                'Cloudinary upload failed:',
                uploadError.message
            );

            return res.status(500).json({
                success: false,
                message: 'Image upload failed. Please try again.'
            });
        }
    });
}

module.exports = uploadMenuImage;
