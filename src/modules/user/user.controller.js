const userService = require('./user.service');
const staffService = require('../staff/staff.service');
const { HTTP_STATUS } = require('../../shared/constants/httpStatus');
const { successResponse } = require('../../shared/utils/response');

async function createVenueAdmin(req, res, next) {
  try {
    const user = await userService.createVenueAdmin(req.body, req.user);

    return successResponse(res, user, 'Venue admin created successfully', HTTP_STATUS.CREATED);
  } catch (error) {
    return next(error);
  }
}

async function assignVenueAdminToVenues(req, res, next) {
  try {
    const user = await userService.assignVenueAdminToVenues(req.params.venueAdminId, req.body, req.user);

    return successResponse(res, user, 'Venue admin venues assigned successfully', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
}

async function createStaff(req, res, next) {
  try {
    const user = await staffService.createStaff(req.body, req.user);

    return successResponse(res, user, 'Staff created successfully', HTTP_STATUS.CREATED);
  } catch (error) {
    return next(error);
  }
}

async function assignStaffToVenues(req, res, next) {
  try {
    const user = await staffService.assignStaffToVenues(req.params.staffId, req.body, req.user);

    return successResponse(res, user, 'Staff venues assigned successfully', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createVenueAdmin,
  assignVenueAdminToVenues,
  createStaff,
  assignStaffToVenues
};
