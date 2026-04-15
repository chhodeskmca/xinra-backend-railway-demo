const venueService = require('./venue.service');
const { HTTP_STATUS } = require('../../shared/constants/httpStatus');
const { successResponse } = require('../../shared/utils/response');

async function listVenues(req, res, next) {
  try {
    const result = await venueService.listVenues(req.query, req.user);

    return successResponse(res, result.venues, 'Venues fetched successfully', HTTP_STATUS.OK, result.meta);
  } catch (error) {
    return next(error);
  }
}

async function createVenue(req, res, next) {
  try {
    const venue = await venueService.createVenue(req.body, req.user);

    return successResponse(res, venue, 'Venue created successfully', HTTP_STATUS.CREATED);
  } catch (error) {
    return next(error);
  }
}

async function getVenueByQrToken(req, res, next) {
  try {
    const venue = await venueService.getVenueByQrToken(req.params.qrToken);

    return successResponse(res, venue, 'Venue details fetched successfully', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
}

async function getVenueById(req, res, next) {
  try {
    const venue = await venueService.getVenueById(req.params.venueId, req.user);

    return successResponse(res, venue, 'Venue fetched successfully', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
}

async function updateVenue(req, res, next) {
  try {
    const venue = await venueService.updateVenue(req.params.venueId, req.body, req.user);

    return successResponse(res, venue, 'Venue updated successfully', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
}

async function deleteVenue(req, res, next) {
  try {
    const venue = await venueService.deleteVenue(req.params.venueId, req.user);

    return successResponse(res, venue, 'Venue deleted successfully', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listVenues,
  createVenue,
  getVenueById,
  updateVenue,
  deleteVenue,
  getVenueByQrToken
};
