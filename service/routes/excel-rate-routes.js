const express = require('express');
const router = express.Router();
const ExcelRateController = require('../controller/excel-rate-controller');
const authMiddleware = require('../middleware/auth-middleware');
const { upload, handleMulterError } = require('../middleware/file-upload');
const { excelRateJobLimiter, jobStatusLimiter } = require('../middleware/rate-limiter');
const apiLogger = require('../middleware/api-logger-middleware');

// Upload Excel for async rate comparison
router.post(
  '/shipments/rates/excel',
  authMiddleware,
  apiLogger(),
  excelRateJobLimiter,
  upload.single('file'),
  handleMulterError,
  ExcelRateController.uploadExcel
);

// Get job status
router.get(
  '/shipments/rates/excel/job/:jobId',
  authMiddleware,
  jobStatusLimiter,
  ExcelRateController.getJobStatus
);

// Download output Excel
router.get(
  '/shipments/rates/excel/download/:jobId',
  authMiddleware,
  ExcelRateController.downloadResult
);

module.exports = router;
