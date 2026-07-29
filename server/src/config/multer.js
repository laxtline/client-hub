// Multer config for handling file uploads (client logos). CONCEPT (multer):
// Express middleware that parses multipart/form-data and exposes the file on
// req.file. We keep the file in memory (a Buffer) so we can send it straight
// to ImageKit without writing a temp file to disk.
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
