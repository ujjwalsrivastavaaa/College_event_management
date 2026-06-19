const express = require('express');
const router = express.Router();
const { getCertificates, downloadCertificate } = require('../controllers/certificateController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getCertificates);
// PDF download route is protected and secured
router.get('/download/:eventId/:studentId', protect, downloadCertificate);

module.exports = router;
