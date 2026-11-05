// Keep logo uploads in memory before sending them to ImageKit.
import multer from 'multer';

// Only accept images, and cap the size so a huge upload can't exhaust memory.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

export default upload;
