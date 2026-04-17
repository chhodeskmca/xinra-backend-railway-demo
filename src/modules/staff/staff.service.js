const { z } = require('zod');
const prisma = require('../../config/db');
const { HTTP_STATUS } = require('../../shared/constants/httpStatus');
const { ROLES } = require('../../shared/constants/roles');
const { AppError } = require('../../shared/utils/appError');
const { hashPassword } = require('../../shared/utils/hash');
const { validateSchema } = require('../../shared/utils/validation');
const {
  VENUE_SAFE_SELECT,
  buildAccessibleVenueFilter,
  findAccessibleVenues,
  serializeVenue
} = require('../../shared/utils/venueAccess');

const STAFF_MUTABLE_FIELDS = ['name', 'email', 'password', 'stripe_account_id', 'venue_ids'];

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

const venueIdsSchema = z.array(
  z.string().trim().uuid('venue_ids must contain valid venue ids')
).min(1, 'At least one venue_id is required')
  .transform((venueIds) => [...new Set(venueIds)]);

const userCreateSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long').max(100),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: passwordSchema
});

const createStaffSchema = userCreateSchema.extend({
  stripe_account_id: optionalString(255),
  venue_ids: venueIdsSchema
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

function serializeStaff(staff) {
  const venues = staff.staffVenueAssignments.map(({ venue }) => serializeVenue(venue));

  return {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    stripe_account_id: staff.stripeAccountId,
    role: staff.role,
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

async function getSerializedStaffById(tx, staffId, actor) {
  const staff = await tx.user.findFirst({
    where: buildStaffWhere(actor, { id: staffId }),
    select: getStaffSelect(actor)
  });

  if (!staff) {
    throw new AppError('Staff user not found', HTTP_STATUS.NOT_FOUND);
  }

  return serializeStaff(staff);
}

function ensureStaffMutationPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AppError('Validation failed', HTTP_STATUS.BAD_REQUEST);
  }

  const hasAnyMutableField = STAFF_MUTABLE_FIELDS.some((field) =>
    Object.prototype.hasOwnProperty.call(payload, field)
  );

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

async function createStaff(payload, actor) {
  const input = validateSchema(createStaffSchema, payload);
  await ensureEmailIsAvailable(input.email);

  const hashedPassword = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    await findAccessibleVenues(tx, input.venue_ids, actor);

    const staff = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hashedPassword,
        stripeAccountId: input.stripe_account_id ?? null,
        role: ROLES.STAFF
      },
      select: {
        id: true
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

    return getSerializedStaffById(tx, staff.id, actor);
  });
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
    staff: staffUsers.map(serializeStaff),
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

async function updateStaff(staffId, payload, actor) {
  const validatedStaffId = validateSchema(staffIdSchema, staffId);
  ensureStaffMutationPayload(payload);
  const input = validateSchema(updateStaffSchema, payload);

  return prisma.$transaction(async (tx) => {
    const staff = await getStaffUserOrFail(tx, validatedStaffId);
    await ensureStaffVisibleToActor(tx, validatedStaffId, actor);
    await ensureStaffFullyManageableByActor(tx, validatedStaffId, actor);

    if (Object.prototype.hasOwnProperty.call(payload, 'email')) {
      await ensureEmailIsAvailable(input.email, staff.id);
    }

    const data = {};

    if (Object.prototype.hasOwnProperty.call(payload, 'name')) {
      data.name = input.name;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'email')) {
      data.email = input.email;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'password')) {
      data.password = await hashPassword(input.password);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'stripe_account_id')) {
      data.stripeAccountId = input.stripe_account_id ?? null;
    }

    if (Object.keys(data).length) {
      await tx.user.update({
        where: { id: staff.id },
        data
      });
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'venue_ids')) {
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

    return getSerializedStaffById(tx, staff.id, actor);
  });
}

async function deleteStaff(staffId, actor) {
  const validatedStaffId = validateSchema(staffIdSchema, staffId);

  return prisma.$transaction(async (tx) => {
    const staff = await getStaffUserOrFail(tx, validatedStaffId);
    await ensureStaffVisibleToActor(tx, validatedStaffId, actor);
    await ensureStaffFullyManageableByActor(tx, validatedStaffId, actor);
    const serializedStaff = await getSerializedStaffById(tx, staff.id, actor);

    await tx.user.delete({
      where: { id: staff.id }
    });

    return serializedStaff;
  });
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
