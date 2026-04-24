const { randomUUID } = require('crypto');
const { z } = require('zod');
const { env } = require('../../config/env');
const prisma = require('../../config/db');
const { HTTP_STATUS } = require('../../shared/constants/httpStatus');
const { ROLES } = require('../../shared/constants/roles');
const {
  ALLOWED_STAFF_IMAGE_CONTENT_TYPES,
  deleteStaffProfileImage,
  getStaffProfileImageUrl,
  uploadStaffProfileImage
} = require('../../shared/integrations/s3');
const { AppError } = require('../../shared/utils/appError');
const { hashPassword } = require('../../shared/utils/hash');
const { validateSchema } = require('../../shared/utils/validation');
const {
  VENUE_SAFE_SELECT,
  buildAccessibleVenueFilter,
  findAccessibleVenues,
  serializeVenue
} = require('../../shared/utils/venueAccess');

const STAFF_MUTABLE_FIELDS = ['name', 'email', 'password', 'stripe_account_id', 'venue_ids', 'profile_image'];

function emptyStringToUndefined(value) {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }

  return value;
}

function optionalString(maxLength) {
  return z.preprocess(
    emptyStringToUndefined,
    z.string().trim().max(maxLength).optional()
  );
}

function coerceOptionalInteger({ min, max, defaultValue, fieldName }) {
  return z.preprocess((value) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    return Number(value);
  }, z.number({
    invalid_type_error: `${fieldName} must be a valid number`
  })
    .int()
    .min(min, `${fieldName} must be at least ${min}`)
    .max(max, `${fieldName} must be at most ${max}`)
    .optional()
    .default(defaultValue));
}

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must be at most 128 characters long');

function normalizeVenueIdsInput(value) {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return value;
  }

  if (trimmedValue.startsWith('[')) {
    try {
      return JSON.parse(trimmedValue);
    } catch (error) {
      return value;
    }
  }

  if (trimmedValue.includes(',')) {
    return trimmedValue.split(',').map((venueId) => venueId.trim()).filter(Boolean);
  }

  return [trimmedValue];
}

const venueIdsSchema = z.preprocess((value) => normalizeVenueIdsInput(value), z.array(
  z.string().trim().uuid('venue_ids must contain valid venue ids')
).min(1, 'At least one venue_id is required')
  .transform((venueIds) => [...new Set(venueIds)]));

const userCreateSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long').max(100),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: passwordSchema
});

const createStaffSchema = userCreateSchema.extend({
  stripe_account_id: optionalString(255),
  venue_ids: venueIdsSchema.optional()
});

const updateStaffSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long').max(100).optional(),
  email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
  password: passwordSchema.optional(),
  stripe_account_id: optionalString(255),
  venue_ids: venueIdsSchema.optional()
});

const assignStaffVenuesSchema = z.object({
  venue_ids: venueIdsSchema
});

const staffIdSchema = z.string().trim().uuid('staffId must be a valid user id');

const listStaffSchema = z.object({
  page: coerceOptionalInteger({ min: 1, max: 100000, defaultValue: 1, fieldName: 'page' }),
  limit: coerceOptionalInteger({ min: 1, max: 100, defaultValue: 20, fieldName: 'limit' }),
  search: optionalString(100),
  venue_id: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().uuid('venue_id must be a valid venue id').optional()
  ),
  sort_by: z.preprocess(
    emptyStringToUndefined,
    z.enum(['created_at', 'updated_at', 'name', 'email']).optional().default('created_at')
  ),
  sort_order: z.preprocess(
    emptyStringToUndefined,
    z.enum(['asc', 'desc']).optional().default('desc')
  )
});

const STAFF_BASE_SELECT = {
  id: true,
  name: true,
  email: true,
  stripeAccountId: true,
  profileImageKey: true,
  profileImageContentType: true,
  profileImageSizeBytes: true,
  profileImageUpdatedAt: true,
  role: true,
  createdAt: true,
  updatedAt: true
};

function getStaffSelect(actor) {
  const venueWhere = actor.role === ROLES.VENUE_ADMIN
    ? {
        venue: buildAccessibleVenueFilter(actor)
      }
    : undefined;

  return {
    ...STAFF_BASE_SELECT,
    staffVenueAssignments: {
      ...(venueWhere ? { where: venueWhere } : {}),
      select: {
        venue: {
          select: VENUE_SAFE_SELECT
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    }
  };
}

async function serializeProfileImage(staff) {
  if (!staff.profileImageKey) {
    return null;
  }

  const signedUrl = await getStaffProfileImageUrl(staff.profileImageKey);

  return {
    key: staff.profileImageKey,
    ...signedUrl,
    content_type: staff.profileImageContentType,
    size_bytes: staff.profileImageSizeBytes,
    uploaded_at: staff.profileImageUpdatedAt
  };
}

async function serializeStaff(staff) {
  const venues = staff.staffVenueAssignments.map(({ venue }) => serializeVenue(venue));

  return {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    stripe_account_id: staff.stripeAccountId,
    role: staff.role,
    profile_image: await serializeProfileImage(staff),
    createdAt: staff.createdAt,
    updatedAt: staff.updatedAt,
    venue_count: venues.length,
    venues
  };
}

async function ensureEmailIsAvailable(email, excludedUserId = null) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  });

  if (existingUser && existingUser.id !== excludedUserId) {
    throw new AppError('Email is already in use', HTTP_STATUS.CONFLICT);
  }
}

function buildStaffWhere(actor, filters = {}) {
  const andConditions = [{ role: ROLES.STAFF }];

  if (actor.role === ROLES.VENUE_ADMIN) {
    andConditions.push({
      staffVenueAssignments: {
        some: {
          venue: buildAccessibleVenueFilter(actor)
        }
      }
    });
  }

  if (filters.id) {
    andConditions.push({ id: filters.id });
  }

  if (filters.search) {
    andConditions.push({
      OR: [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } }
      ]
    });
  }

  if (filters.venueId) {
    const venueFilter = actor.role === ROLES.VENUE_ADMIN
      ? {
          venueId: filters.venueId,
          venue: buildAccessibleVenueFilter(actor)
        }
      : {
          venueId: filters.venueId
        };

    andConditions.push({
      staffVenueAssignments: {
        some: venueFilter
      }
    });
  }

  return { AND: andConditions };
}

function getStaffOrderBy(sortBy, sortOrder) {
  if (sortBy === 'name') {
    return [{ name: sortOrder }, { createdAt: 'desc' }];
  }

  if (sortBy === 'email') {
    return [{ email: sortOrder }, { createdAt: 'desc' }];
  }

  if (sortBy === 'updated_at') {
    return [{ updatedAt: sortOrder }, { createdAt: 'desc' }];
  }

  return [{ createdAt: sortOrder }, { id: 'desc' }];
}

async function getStaffUserOrFail(tx, staffId) {
  const staff = await tx.user.findUnique({
    where: { id: staffId },
    select: STAFF_BASE_SELECT
  });

  if (!staff || staff.role !== ROLES.STAFF) {
    throw new AppError('Staff user not found', HTTP_STATUS.NOT_FOUND);
  }

  return staff;
}

function normalizeStaffPayload(payload = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }

  if (
    !Object.prototype.hasOwnProperty.call(payload, 'venue_ids') &&
    Object.prototype.hasOwnProperty.call(payload, 'venue_ids[]')
  ) {
    return {
      ...payload,
      venue_ids: payload['venue_ids[]']
    };
  }

  return payload;
}

function validateStaffProfileImageFile(file) {
  if (!file) {
    return;
  }

  if (!ALLOWED_STAFF_IMAGE_CONTENT_TYPES.includes(file.mimetype)) {
    throw new AppError('Profile image must be a JPEG or PNG file', HTTP_STATUS.BAD_REQUEST);
  }

  if (file.size > env.staffImageMaxBytes) {
    throw new AppError('Profile image must be 2MB or smaller', HTTP_STATUS.BAD_REQUEST);
  }

  const isJpeg = file.buffer?.length >= 3 &&
    file.buffer[0] === 0xff &&
    file.buffer[1] === 0xd8 &&
    file.buffer[2] === 0xff;
  const isPng = file.buffer?.length >= 8 &&
    file.buffer[0] === 0x89 &&
    file.buffer[1] === 0x50 &&
    file.buffer[2] === 0x4e &&
    file.buffer[3] === 0x47 &&
    file.buffer[4] === 0x0d &&
    file.buffer[5] === 0x0a &&
    file.buffer[6] === 0x1a &&
    file.buffer[7] === 0x0a;

  if ((file.mimetype === 'image/jpeg' && !isJpeg) || (file.mimetype === 'image/png' && !isPng)) {
    throw new AppError('Profile image content does not match the declared file type', HTTP_STATUS.BAD_REQUEST);
  }
}

async function deleteStaffProfileImageBestEffort(key) {
  if (!key) {
    return;
  }

  try {
    await deleteStaffProfileImage(key);
  } catch (error) {
    console.warn(`Failed to delete staff profile image from S3: ${key}`, error);
  }
}

async function ensureStaffVisibleToActor(tx, staffId, actor) {
  if (actor.role === ROLES.ADMIN) {
    return;
  }

  const visibleAssignments = await tx.staffVenue.count({
    where: {
      staffId,
      venue: buildAccessibleVenueFilter(actor)
    }
  });

  if (!visibleAssignments) {
    throw new AppError('Staff user not found', HTTP_STATUS.NOT_FOUND);
  }
}

async function ensureStaffFullyManageableByActor(tx, staffId, actor) {
  if (actor.role === ROLES.ADMIN) {
    return;
  }

  const [totalAssignments, visibleAssignments] = await Promise.all([
    tx.staffVenue.count({
      where: {
        staffId
      }
    }),
    tx.staffVenue.count({
      where: {
        staffId,
        venue: buildAccessibleVenueFilter(actor)
      }
    })
  ]);

  if (totalAssignments !== visibleAssignments) {
    throw new AppError(
      'This staff user has venue assignments outside your access and cannot be modified here',
      HTTP_STATUS.FORBIDDEN
    );
  }
}

async function getStaffRecordByIdOrFail(tx, staffId, actor) {
  const staff = await tx.user.findFirst({
    where: buildStaffWhere(actor, { id: staffId }),
    select: getStaffSelect(actor)
  });

  if (!staff) {
    throw new AppError('Staff user not found', HTTP_STATUS.NOT_FOUND);
  }

  return staff;
}

async function getStaffRecordForCreateResponseOrFail(tx, staffId, actor) {
  const staff = await tx.user.findFirst({
    where: {
      id: staffId,
      role: ROLES.STAFF
    },
    select: getStaffSelect(actor)
  });

  if (!staff) {
    throw new AppError('Staff user not found', HTTP_STATUS.NOT_FOUND);
  }

  return staff;
}

async function getSerializedStaffById(tx, staffId, actor) {
  const staff = await getStaffRecordByIdOrFail(tx, staffId, actor);

  return serializeStaff(staff);
}

function ensureStaffMutationPayload(payload, profileImageFile = null) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AppError('Validation failed', HTTP_STATUS.BAD_REQUEST);
  }

  const hasAnyMutableField = STAFF_MUTABLE_FIELDS.some((field) => {
    if (field === 'profile_image') {
      return Boolean(profileImageFile);
    }

    return Object.prototype.hasOwnProperty.call(payload, field);
  });

  if (!hasAnyMutableField) {
    throw new AppError(
      `At least one of ${STAFF_MUTABLE_FIELDS.join(', ')} is required`,
      HTTP_STATUS.BAD_REQUEST
    );
  }
}

function normalizeStaffListFilters(query) {
  return validateSchema(listStaffSchema, query);
}

async function createStaff(payload, actor, profileImageFile = null) {
  const normalizedPayload = normalizeStaffPayload(payload);
  const input = validateSchema(createStaffSchema, normalizedPayload);
  const venueIds = input.venue_ids ?? [];
  validateStaffProfileImageFile(profileImageFile);
  await ensureEmailIsAvailable(input.email);

  if (venueIds.length) {
    await findAccessibleVenues(prisma, venueIds, actor);
  }

  const hashedPassword = await hashPassword(input.password);
  const staffId = randomUUID();
  const uploadedImage = profileImageFile
    ? await uploadStaffProfileImage({ staffId, file: profileImageFile })
    : null;

  try {
    const staff = await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: staffId,
          name: input.name,
          email: input.email,
          password: hashedPassword,
          stripeAccountId: input.stripe_account_id ?? null,
          profileImageKey: uploadedImage?.key ?? null,
          profileImageContentType: uploadedImage?.contentType ?? null,
          profileImageSizeBytes: uploadedImage?.sizeBytes ?? null,
          profileImageUpdatedAt: uploadedImage?.uploadedAt ?? null,
          role: ROLES.STAFF
        },
        select: {
          id: true
        }
      });

      if (venueIds.length) {
        await tx.staffVenue.createMany({
          data: venueIds.map((venueId) => ({
            staffId,
            venueId,
            assignedById: actor.id
          })),
          skipDuplicates: true
        });
      }

      return getStaffRecordForCreateResponseOrFail(tx, staffId, actor);
    });

    return serializeStaff(staff);
  } catch (error) {
    await deleteStaffProfileImageBestEffort(uploadedImage?.key);
    throw error;
  }
}

async function listStaff(query, actor) {
  const filters = normalizeStaffListFilters(query);

  if (filters.venue_id) {
    await findAccessibleVenues(prisma, [filters.venue_id], actor);
  }

  const where = buildStaffWhere(actor, {
    search: filters.search,
    venueId: filters.venue_id
  });
  const skip = (filters.page - 1) * filters.limit;

  const [staffUsers, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: getStaffSelect(actor),
      orderBy: getStaffOrderBy(filters.sort_by, filters.sort_order),
      skip,
      take: filters.limit
    }),
    prisma.user.count({ where })
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / filters.limit);

  return {
    staff: await Promise.all(staffUsers.map(serializeStaff)),
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      total_pages: totalPages,
      has_next_page: filters.page < totalPages,
      has_previous_page: filters.page > 1
    }
  };
}

async function getStaffById(staffId, actor) {
  const validatedStaffId = validateSchema(staffIdSchema, staffId);

  const staff = await prisma.user.findFirst({
    where: buildStaffWhere(actor, { id: validatedStaffId }),
    select: getStaffSelect(actor)
  });

  if (!staff) {
    throw new AppError('Staff user not found', HTTP_STATUS.NOT_FOUND);
  }

  return serializeStaff(staff);
}

async function updateStaff(staffId, payload, actor, profileImageFile = null) {
  const validatedStaffId = validateSchema(staffIdSchema, staffId);
  const normalizedPayload = normalizeStaffPayload(payload);
  ensureStaffMutationPayload(normalizedPayload, profileImageFile);
  const input = validateSchema(updateStaffSchema, normalizedPayload);
  validateStaffProfileImageFile(profileImageFile);

  await prisma.$transaction(async (tx) => {
    const staff = await getStaffUserOrFail(tx, validatedStaffId);
    await ensureStaffVisibleToActor(tx, validatedStaffId, actor);
    await ensureStaffFullyManageableByActor(tx, validatedStaffId, actor);

    if (Object.prototype.hasOwnProperty.call(normalizedPayload, 'email')) {
      await ensureEmailIsAvailable(input.email, staff.id);
    }

    if (Object.prototype.hasOwnProperty.call(normalizedPayload, 'venue_ids')) {
      await findAccessibleVenues(tx, input.venue_ids, actor);
    }
  });

  const uploadedImage = profileImageFile
    ? await uploadStaffProfileImage({ staffId: validatedStaffId, file: profileImageFile })
    : null;

  let previousImageKey = null;

  try {
    const updatedStaff = await prisma.$transaction(async (tx) => {
      const staff = await getStaffUserOrFail(tx, validatedStaffId);
      await ensureStaffVisibleToActor(tx, validatedStaffId, actor);
      await ensureStaffFullyManageableByActor(tx, validatedStaffId, actor);

      previousImageKey = staff.profileImageKey;

      if (Object.prototype.hasOwnProperty.call(normalizedPayload, 'email')) {
        await ensureEmailIsAvailable(input.email, staff.id);
      }

      const data = {};

      if (Object.prototype.hasOwnProperty.call(normalizedPayload, 'name')) {
        data.name = input.name;
      }

      if (Object.prototype.hasOwnProperty.call(normalizedPayload, 'email')) {
        data.email = input.email;
      }

      if (Object.prototype.hasOwnProperty.call(normalizedPayload, 'password')) {
        data.password = await hashPassword(input.password);
      }

      if (Object.prototype.hasOwnProperty.call(normalizedPayload, 'stripe_account_id')) {
        data.stripeAccountId = input.stripe_account_id ?? null;
      }

      if (uploadedImage) {
        data.profileImageKey = uploadedImage.key;
        data.profileImageContentType = uploadedImage.contentType;
        data.profileImageSizeBytes = uploadedImage.sizeBytes;
        data.profileImageUpdatedAt = uploadedImage.uploadedAt;
      }

      if (Object.keys(data).length) {
        await tx.user.update({
          where: { id: staff.id },
          data
        });
      }

      if (Object.prototype.hasOwnProperty.call(normalizedPayload, 'venue_ids')) {
        await findAccessibleVenues(tx, input.venue_ids, actor);

        await tx.staffVenue.deleteMany({
          where: {
            staffId: staff.id
          }
        });

        await tx.staffVenue.createMany({
          data: input.venue_ids.map((venueId) => ({
            staffId: staff.id,
            venueId,
            assignedById: actor.id
          })),
          skipDuplicates: true
        });
      }

      return getStaffRecordByIdOrFail(tx, staff.id, actor);
    });

    if (uploadedImage && previousImageKey && previousImageKey !== uploadedImage.key) {
      await deleteStaffProfileImageBestEffort(previousImageKey);
    }

    return serializeStaff(updatedStaff);
  } catch (error) {
    await deleteStaffProfileImageBestEffort(uploadedImage?.key);
    throw error;
  }
}

async function deleteStaff(staffId, actor) {
  const validatedStaffId = validateSchema(staffIdSchema, staffId);
  let imageKeyToDelete = null;

  const serializedStaff = await prisma.$transaction(async (tx) => {
    const staff = await getStaffUserOrFail(tx, validatedStaffId);
    await ensureStaffVisibleToActor(tx, validatedStaffId, actor);
    await ensureStaffFullyManageableByActor(tx, validatedStaffId, actor);
    imageKeyToDelete = staff.profileImageKey;
    const serializedStaff = await getSerializedStaffById(tx, staff.id, actor);

    await tx.user.delete({
      where: { id: staff.id }
    });

    return serializedStaff;
  });

  await deleteStaffProfileImageBestEffort(imageKeyToDelete);

  return serializedStaff;
}

async function assignStaffToVenues(staffId, payload, actor) {
  const validatedStaffId = validateSchema(staffIdSchema, staffId);
  const input = validateSchema(assignStaffVenuesSchema, payload);

  return prisma.$transaction(async (tx) => {
    await getStaffUserOrFail(tx, validatedStaffId);
    await findAccessibleVenues(tx, input.venue_ids, actor);

    await tx.staffVenue.createMany({
      data: input.venue_ids.map((venueId) => ({
        staffId: validatedStaffId,
        venueId,
        assignedById: actor.id
      })),
      skipDuplicates: true
    });

    return getSerializedStaffById(tx, validatedStaffId, actor);
  });
}

module.exports = {
  createStaff,
  listStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
  assignStaffToVenues
};
