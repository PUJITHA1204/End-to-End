const multer = require('multer');
const path = require('path');

// Configure how and where files are saved
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Saves to the uploads folder
    },
    filename: (req, file, cb) => {
        // Renames file to: 162548292.pdf (timestamp + extension)
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5000000 }, // Limit to 5MB
});

module.exports = upload;