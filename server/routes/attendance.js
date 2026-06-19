const express = require('express');
const router = express.Router();
const {
  getQRCode,
  markAttendance,
  verifyOTP,
  markStudentPresentManual,
  getAttendanceReport,
  exportAttendanceExcel,
  exportAttendanceCSV,
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/event/:id/qrcode', authorize('clubHead', 'admin'), getQRCode);
router.post('/scan', markAttendance);
router.post('/verify-otp', verifyOTP);
router.post('/event/:id/manual-checkin', authorize('clubHead', 'admin'), markStudentPresentManual);
router.get('/event/:id/report', authorize('clubHead', 'admin'), getAttendanceReport);
router.get('/event/:id/export-excel', authorize('clubHead', 'admin'), exportAttendanceExcel);
router.get('/event/:id/export-csv', authorize('clubHead', 'admin'), exportAttendanceCSV);

module.exports = router;
