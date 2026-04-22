const staffService = require('./staff.service');
const { HTTP_STATUS } = require('../../shared/constants/httpStatus');
const { successResponse } = require('../../shared/utils/response');

async function createStaff(req, res, next) {
  try {
    const staff = await staffService.createStaff(req.body, req.user, req.file);

    return successResponse(res, staff, 'Staff created successfully', HTTP_STATUS.CREATED);
  } catch (error) {
    return next(error);
  }
}

async function listStaff(req, res, next) {
  try {
    const result = await staffService.listStaff(req.query, req.user);

    return successResponse(res, result.staff, 'Staff fetched successfully', HTTP_STATUS.OK, result.meta);
  } catch (error) {
    return next(error);
  }
}

async function getStaffById(req, res, next) {
  try {
    const staff = await staffService.getStaffById(req.params.staffId, req.user);

    return successResponse(res, staff, 'Staff fetched successfully', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
}

async function updateStaff(req, res, next) {
  try {
    const staff = await staffService.updateStaff(req.params.staffId, req.body, req.user, req.file);

    return successResponse(res, staff, 'Staff updated successfully', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
}

async function deleteStaff(req, res, next) {
  try {
    const staff = await staffService.deleteStaff(req.params.staffId, req.user);

    return successResponse(res, staff, 'Staff deleted successfully', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
}

async function assignStaffToVenues(req, res, next) {
  try {
    const staff = await staffService.assignStaffToVenues(req.params.staffId, req.body, req.user);

    return successResponse(res, staff, 'Staff venues assigned successfully', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createStaff,
  listStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
  assignStaffToVenues
};
