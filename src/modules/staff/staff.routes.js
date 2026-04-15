const express = require('express');
const staffController = require('./staff.controller');
const { ROLES } = require('../../shared/constants/roles');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { authorize } = require('../../shared/middleware/role.middleware');

const router = express.Router();

router.get(
  '/',
  authenticate,
  authorize([ROLES.ADMIN, ROLES.VENUE_ADMIN]),
  staffController.listStaff
);

router.post(
  '/',
  authenticate,
  authorize([ROLES.ADMIN, ROLES.VENUE_ADMIN]),
  staffController.createStaff
);

router.get(
  '/:staffId',
  authenticate,
  authorize([ROLES.ADMIN, ROLES.VENUE_ADMIN]),
  staffController.getStaffById
);

router.patch(
  '/:staffId',
  authenticate,
  authorize([ROLES.ADMIN, ROLES.VENUE_ADMIN]),
  staffController.updateStaff
);

router.delete(
  '/:staffId',
  authenticate,
  authorize([ROLES.ADMIN, ROLES.VENUE_ADMIN]),
  staffController.deleteStaff
);

router.post(
  '/:staffId/venues',
  authenticate,
  authorize([ROLES.ADMIN, ROLES.VENUE_ADMIN]),
  staffController.assignStaffToVenues
);

module.exports = router;
