const express = require('express');
const statsController = require('./stats.controller');
const { ROLES } = require('../../shared/constants/roles');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { authorize } = require('../../shared/middleware/role.middleware');

const router = express.Router();

router.get(
  '/dashboard',
  authenticate,
  authorize([ROLES.ADMIN, ROLES.VENUE_ADMIN, ROLES.STAFF]),
  statsController.getDashboardStats
);

module.exports = router;
