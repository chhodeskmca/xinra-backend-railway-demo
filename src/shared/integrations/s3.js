const { randomUUID } = require('crypto');
const {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { env } = require('../../config/env');
const { HTTP_STATUS } = require('../constants/httpStatus');
const { AppError } = require('../utils/appError');

const ALLOWED_STAFF_IMAGE_CONTENT_TYPES = Object.freeze(['image/jpeg', 'image/png']);
const STAFF_IMAGE_URL_TYPE = 'AWS_S3_PRE_SIGNED_GET';

let s3Client;

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.awsRegion
    });
  }

  return s3Client;
}

function getStaffImageBucket() {
  if (!env.s3StaffImageBucket) {
    throw new AppError('Staff image storage is not configured', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  return env.s3StaffImageBucket;
}

function getStaffImageExtension(contentType) {
  if (contentType === 'image/jpeg') {
    return 'jpg';
  }

  if (contentType === 'image/png') {
    return 'png';
  }

  throw new AppError('Profile image must be a JPEG or PNG file', HTTP_STATUS.BAD_REQUEST);
}

function buildStaffImageKey(staffId, contentType) {
  const extension = getStaffImageExtension(contentType);

  return `staff/${staffId}/profile/${randomUUID()}.${extension}`;
}

async function uploadStaffProfileImage({ staffId, file }) {
  const bucket = getStaffImageBucket();
  const key = buildStaffImageKey(staffId, file.mimetype);

  await getS3Client().send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype
  }));

  return {
    key,
    contentType: file.mimetype,
    sizeBytes: file.size,
    uploadedAt: new Date()
  };
}

async function deleteStaffProfileImage(key) {
  if (!key) {
    return;
  }

  await getS3Client().send(new DeleteObjectCommand({
    Bucket: getStaffImageBucket(),
    Key: key
  }));
}

async function getStaffProfileImageUrl(key) {
  if (!key) {
    return null;
  }

  const expiresIn = env.s3ReadUrlExpiresSeconds;
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  const url = await getSignedUrl(
    getS3Client(),
    new GetObjectCommand({
      Bucket: getStaffImageBucket(),
      Key: key
    }),
    { expiresIn }
  );

  return {
    url,
    url_type: STAFF_IMAGE_URL_TYPE,
    expires_in: expiresIn,
    expires_at: expiresAt
  };
}

module.exports = {
  ALLOWED_STAFF_IMAGE_CONTENT_TYPES,
  deleteStaffProfileImage,
  getStaffProfileImageUrl,
  uploadStaffProfileImage
};
