const { z } = require('zod');
const prisma = require('../../config/db');
const { HTTP_STATUS } = require('../../shared/constants/httpStatus');
const { ROLES } = require('../../shared/constants/roles');
const { AppError } = require('../../shared/utils/appError');
const { validateSchema } = require('../../shared/utils/validation');
const { buildQrScanUrl, generateQrToken } = require('../../shared/utils/venueQr');

const VENUE_MUTABLE_FIELDS = [
  'name',
  'address',
  'email',
  'telephone_number',
  'stripe_account_id',
  'australian_business_number'
];

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

const optionalEmail = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().email().transform((value) => value.toLowerCase()).optional()
);

const venueWriteSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long').max(150),
  address: optionalString(255),
  email: optionalEmail,
  telephone_number: optionalString(30),
  stripe_account_id: optionalString(255),
  australian_business_number: optionalString(20)
});

const createVenueSchema = venueWriteSchema;
const updateVenueSchema = venueWriteSchema.partial();

const venueIdSchema = z.string().trim().uuid('venueId must be a valid venue id');
const qrTokenSchema = z.string().trim().min(1, 'qrToken is required').max(128);

const listVenuesSchema = z.object({
  page: coerceOptionalInteger({ min: 1, max: 100000, defaultValue: 1, fieldName: 'page' }),
  limit: coerceOptionalInteger({ min: 1, max: 100, defaultValue: 20, fieldName: 'limit' }),
  search: optionalString(100),
  created_by_id: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().uuid('created_by_id must be a valid user id').optional()
  ),
  venue_admin_id: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().uuid('venue_admin_id must be a valid user id').optional()
  ),
  sort_by: z.preprocess(
    emptyStringToUndefined,
    z.enum(['created_at', 'updated_at', 'name']).optional().default('created_at')
  ),
  sort_order: z.preprocess(
    emptyStringToUndefined,
    z.enum(['asc', 'desc']).optional().default('desc')
  )
});

const VENUE_ADMIN_SAFE_SELECT = {
  id: true,
  name: true,
  email: true
};

const VENUE_SAFE_SELECT = {
  id: true,
  name: true,
  address: true,
  email: true,
  telephoneNumber: true,
  stripeAccountId: true,
  australianBusinessNumber: true,
  qrToken: true,
  createdById: true,
  createdAt: true,
  updatedAt: true
};

const VENUE_AUTH_SELECT = {
  ...VENUE_SAFE_SELECT,
  adminAssignments: {
    select: {
      admin: {
        select: VENUE_ADMIN_SAFE_SELECT
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  },
  _count: {
    select: {
      adminAssignments: true,
      staffAssignments: true
    }
  }
};

const VENUE_PUBLIC_SELECT = {
  id: true,
  name: true,
  address: true,
  email: true,
  telephoneNumber: true,
  qrToken: true,
  createdAt: true,
  updatedAt: true,
  staffAssignments: {
    select: {
      staff: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  }
};

function serializeVenueAdmin(admin) {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email
  };
}

function serializeVenue(venue) {
  return {
    id: venue.id,
    name: venue.name,
    address: venue.address,
    email: venue.email,
    telephone_number: venue.telephoneNumber,
    stripe_account_id: venue.stripeAccountId,
    australian_business_number: venue.australianBusinessNumber,
    qr_token: venue.qrToken,
    qr_scan_url: buildQrScanUrl(venue.qrToken),
    created_by_id: venue.createdById,
    createdAt: venue.createdAt,
    updatedAt: venue.updatedAt
  };
}

function serializeAuthenticatedVenue(venue) {
  return {
    ...serializeVenue(venue),
    admins: venue.adminAssignments.map(({ admin }) => serializeVenueAdmin(admin)),
    admin_count: venue._count.adminAssignments,
    staff_count: venue._count.staffAssignments
  };
}

function serializePublicVenueDetails(venue) {
  return {
    id: venue.id,
    name: venue.name,
    address: venue.address,
    email: venue.email,
    telephone_number: venue.telephoneNumber,
    qr_token: venue.qrToken,
    qr_scan_url: buildQrScanUrl(venue.qrToken),
    createdAt: venue.createdAt,
    updatedAt: venue.updatedAt,
    staff: venue.staffAssignments.map(({ staff }) => ({
      id: staff.id,
      name: staff.name
    }))
  };
}

function ensureVenueMutationPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AppError('Validation failed', HTTP_STATUS.BAD_REQUEST);
  }

  const hasAnyVenueField = VENUE_MUTABLE_FIELDS.some((field) =>
    Object.prototype.hasOwnProperty.call(payload, field)
  );

  if (!hasAnyVenueField) {
    throw new AppError(
      `At least one of ${VENUE_MUTABLE_FIELDS.join(', ')} is required`,
      HTTP_STATUS.BAD_REQUEST
    );
  }
}

function buildVenueMutationData(input, payload) {
  const data = {};

  if (Object.prototype.hasOwnProperty.call(payload, 'name')) {
    data.name = input.name;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'address')) {
    data.address = input.address ?? null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'email')) {
    data.email = input.email ?? null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'telephone_number')) {
    data.telephoneNumber = input.telephone_number ?? null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'stripe_account_id')) {
    data.stripeAccountId = input.stripe_account_id ?? null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'australian_business_number')) {
    data.australianBusinessNumber = input.australian_business_number ?? null;
  }

  return data;
}

function buildVenueWhere(actor, filters = {}) {
  const andConditions = [];

  if (actor.role === ROLES.VENUE_ADMIN) {
    andConditions.push({
      adminAssignments: {
        some: {
          adminId: actor.id
        }
      }
    });
  }

  if (filters.id) {
    andConditions.push({ id: filters.id });
  }

  if (filters.createdById) {
    andConditions.push({ createdById: filters.createdById });
  }

  if (filters.venueAdminId) {
    andConditions.push({
      adminAssignments: {
        some: {
          adminId: filters.venueAdminId
        }
      }
    });
  }

  if (filters.search) {
    andConditions.push({
      OR: [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { address: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { telephoneNumber: { contains: filters.search, mode: 'insensitive' } },
        { stripeAccountId: { contains: filters.search, mode: 'insensitive' } },
        { australianBusinessNumber: { contains: filters.search, mode: 'insensitive' } }
      ]
    });
  }

  return andConditions.length ? { AND: andConditions } : {};
}

function getVenueOrderBy(sortBy, sortOrder) {
  if (sortBy === 'name') {
    return [{ name: sortOrder }, { createdAt: 'desc' }];
  }

  if (sortBy === 'updated_at') {
    return [{ updatedAt: sortOrder }, { createdAt: 'desc' }];
  }

  return [{ createdAt: sortOrder }, { id: 'desc' }];
}

function normalizeVenueListFilters(query, actor) {
  const filters = validateSchema(listVenuesSchema, query);

  if (
    actor.role === ROLES.VENUE_ADMIN &&
    filters.venue_admin_id &&
    filters.venue_admin_id !== actor.id
  ) {
    throw new AppError(
      'Venue admins can only filter venues for their own admin account',
      HTTP_STATUS.FORBIDDEN
    );
  }

  return filters;
}

async function getAccessibleVenueRecord(tx, venueId, actor) {
  const venue = await tx.venue.findFirst({
    where: buildVenueWhere(actor, { id: venueId }),
    select: VENUE_AUTH_SELECT
  });

  if (!venue) {
    throw new AppError('Venue not found', HTTP_STATUS.NOT_FOUND);
  }

  return venue;
}

async function createVenue(payload, creator) {
  const input = validateSchema(createVenueSchema, payload);

  return prisma.$transaction(async (tx) => {
    const venue = await tx.venue.create({
      data: {
        name: input.name,
        address: input.address ?? null,
        email: input.email ?? null,
        telephoneNumber: input.telephone_number ?? null,
        stripeAccountId: input.stripe_account_id ?? null,
        australianBusinessNumber: input.australian_business_number ?? null,
        qrToken: generateQrToken(),
        createdById: creator.id
      },
      select: { id: true }
    });

    if (creator.role === ROLES.VENUE_ADMIN) {
      await tx.venueAdmin.create({
        data: {
          venueId: venue.id,
          adminId: creator.id,
          assignedById: creator.id
        }
      });
    }

    const createdVenue = await tx.venue.findUnique({
      where: { id: venue.id },
      select: VENUE_AUTH_SELECT
    });

    return serializeAuthenticatedVenue(createdVenue);
  });
}

async function listVenues(query, actor) {
  const filters = normalizeVenueListFilters(query, actor);
  const where = buildVenueWhere(actor, {
    search: filters.search,
    createdById: filters.created_by_id,
    venueAdminId: filters.venue_admin_id
  });

  const skip = (filters.page - 1) * filters.limit;

  const [venues, total] = await prisma.$transaction([
    prisma.venue.findMany({
      where,
      select: VENUE_AUTH_SELECT,
      orderBy: getVenueOrderBy(filters.sort_by, filters.sort_order),
      skip,
      take: filters.limit
    }),
    prisma.venue.count({ where })
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / filters.limit);

  return {
    venues: venues.map(serializeAuthenticatedVenue),
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

async function getVenueById(venueId, actor) {
  const validatedVenueId = validateSchema(venueIdSchema, venueId);

  const venue = await prisma.venue.findFirst({
    where: buildVenueWhere(actor, { id: validatedVenueId }),
    select: VENUE_AUTH_SELECT
  });

  if (!venue) {
    throw new AppError('Venue not found', HTTP_STATUS.NOT_FOUND);
  }

  return serializeAuthenticatedVenue(venue);
}

async function updateVenue(venueId, payload, actor) {
  const validatedVenueId = validateSchema(venueIdSchema, venueId);
  ensureVenueMutationPayload(payload);
  const input = validateSchema(updateVenueSchema, payload);
  const data = buildVenueMutationData(input, payload);

  return prisma.$transaction(async (tx) => {
    await getAccessibleVenueRecord(tx, validatedVenueId, actor);

    await tx.venue.update({
      where: { id: validatedVenueId },
      data
    });

    const updatedVenue = await tx.venue.findUnique({
      where: { id: validatedVenueId },
      select: VENUE_AUTH_SELECT
    });

    return serializeAuthenticatedVenue(updatedVenue);
  });
}

async function deleteVenue(venueId, actor) {
  const validatedVenueId = validateSchema(venueIdSchema, venueId);

  return prisma.$transaction(async (tx) => {
    const venue = await getAccessibleVenueRecord(tx, validatedVenueId, actor);

    await tx.venue.delete({
      where: { id: validatedVenueId }
    });

    return serializeAuthenticatedVenue(venue);
  });
}

async function getVenueByQrToken(qrToken) {
  const validatedQrToken = validateSchema(qrTokenSchema, qrToken);

  const venue = await prisma.venue.findUnique({
    where: { qrToken: validatedQrToken },
    select: VENUE_PUBLIC_SELECT
  });

  if (!venue) {
    throw new AppError('Venue not found for this QR token', HTTP_STATUS.NOT_FOUND);
  }

  return serializePublicVenueDetails(venue);
}

module.exports = {
  createVenue,
  listVenues,
  getVenueById,
  updateVenue,
  deleteVenue,
  getVenueByQrToken
};
