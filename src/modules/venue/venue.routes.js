const express = require('express');
const venueController = require('./venue.controller');
const { ROLES } = require('../../shared/constants/roles');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { authorize } = require('../../shared/middleware/role.middleware');

const router = express.Router();

router.get('/qr/:qrToken', venueController.getVenueByQrToken);

router.get(
  '/',
  authenticate,
  authorize([ROLES.ADMIN, ROLES.VENUE_ADMIN]),
  venueController.listVenues
);

router.post(
  '/',
  authenticate,
  authorize([ROLES.ADMIN, ROLES.VENUE_ADMIN]),
  venueController.createVenue
);

router.get(
  '/:venueId',
  authenticate,
  authorize([ROLES.ADMIN, ROLES.VENUE_ADMIN]),
  venueController.getVenueById
);

router.patch(
  '/:venueId',
  authenticate,
  authorize([ROLES.ADMIN, ROLES.VENUE_ADMIN]),
  venueController.updateVenue
);

router.delete(
  '/:venueId',
  authenticate,
  authorize([ROLES.ADMIN, ROLES.VENUE_ADMIN]),
  venueController.deleteVenue
);

module.exports = router;
