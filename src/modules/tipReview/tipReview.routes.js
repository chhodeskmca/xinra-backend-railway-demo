const express = require('express');
const tipReviewController = require('./tipReview.controller');

const router = express.Router();

router.post('/', tipReviewController.submitTipReview);

module.exports = router;
