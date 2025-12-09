const express = require('express');

const router = express.Router();
const CheckController = require('../controller/check-controller');
const { upload, handleMulterError } = require('../middleware/file-upload');

router.get('/checks', CheckController.getAllChecks);
router.get('/checks/:id', CheckController.getCheckById);
router.post('/checks', CheckController.createCheck);
router.put('/checks/:id', CheckController.updateCheck);
router.delete('/checks/:id', CheckController.deleteCheck);

// File upload endpoint
router.post('/upload', upload.single('file'), handleMulterError, CheckController.uploadFile);

module.exports = router;
