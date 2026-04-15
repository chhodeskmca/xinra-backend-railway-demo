const express = require('express');
const userController = require('./user.controller');
const { ROLES } = require('../../shared/constants/roles');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { authorize } = require('../../shared/middleware/role.middleware');

const router = express.Router();

router.post(
  '/venue-admin',
  authenticate,
  authorize([ROLES.ADMIN]),
  userController.createVenueAdmin
);

router.post(
  '/venue-admin/:venueAdminId/venues',
  authenticate,
  authorize([ROLES.ADMIN]),
  userController.assignVenueAdminToVenues
);

router.post(
  '/staff',
  authenticate,
  authorize([ROLES.ADMIN, ROLES.VENUE_ADMIN]),
  userController.createStaff
);

router.post(
  '/staff/:staffId/venues',
  authenticate,
  authorize([ROLES.ADMIN, ROLES.VENUE_ADMIN]),
  userController.assignStaffToVenues
);

module.exports = router;
