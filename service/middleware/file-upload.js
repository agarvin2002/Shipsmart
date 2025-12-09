const multer = require('multer');
const { ApplicationError } = require('@shipsmart/errors');
const cls = require('cls-hooked');

// Get CLS namespace
const namespace = cls.getNamespace('shipsmart_sequel_trans');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  // Accept all file types for now
  // Can add specific validation here if needed
  cb(null, true);
};

// Configure multer upload
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit (same as doc-gen)
  },
});

// CLS-aware wrapper for multer middleware
// Multer's internal callbacks can break CLS context, so we wrap it
const clsWrapMulter = (multerMiddleware) => {
  return (req, res, next) => {
    if (!namespace) {
      return multerMiddleware(req, res, next);
    }

    // Capture the current CLS context
    const requestId = namespace.get('requestId');

    // Wrap next to restore context
    const wrappedNext = namespace.bind((err) => {
      if (requestId) {
        namespace.set('requestId', requestId);
      }
      next(err);
    });

    // Run multer within the CLS context
    namespace.run(() => {
      if (requestId) {
        namespace.set('requestId', requestId);
      }
      multerMiddleware(req, res, wrappedNext);
    });
  };
};

// Wrap upload.single with CLS context preservation
const clsAwareUpload = {
  single: (fieldName) => clsWrapMulter(upload.single(fieldName)),
  array: (fieldName, maxCount) => clsWrapMulter(upload.array(fieldName, maxCount)),
  fields: (fields) => clsWrapMulter(upload.fields(fields)),
  any: () => clsWrapMulter(upload.any()),
  none: () => clsWrapMulter(upload.none()),
};

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new ApplicationError('File size exceeds 20MB limit', 400));
    }
    return next(new ApplicationError(`File upload error: ${err.message}`, 400));
  }
  next(err);
};

module.exports = {
  upload: clsAwareUpload,
  handleMulterError,
};
