const express = require('express');

const router = express.Router();
const CheckController = require('../controller/check-controller');

router.get('/checks', CheckController.getAllChecks);
router.get('/checks/:id', CheckController.getCheckById);
router.post('/checks', CheckController.createCheck);
router.put('/checks/:id', CheckController.updateCheck);
router.delete('/checks/:id', CheckController.deleteCheck);

module.exports = router;
