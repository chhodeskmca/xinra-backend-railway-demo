const { z } = require('zod');
const prisma = require('../../config/db');
const { HTTP_STATUS } = require('../../shared/constants/httpStatus');
const { ROLES } = require('../../shared/constants/roles');
const { AppError } = require('../../shared/utils/appError');
const { hashPassword } = require('../../shared/utils/hash');
const { validateSchema } = require('../../shared/utils/validation');
const { findAccessibleVenues, serializeVenue } = require('../../shared/utils/venueAccess');

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must be at most 128 characters long');

const venueIdsSchema = z.array(
  z.string().trim().uuid('venue_ids must contain valid venue ids')
).min(1, 'At least one venue_id is required')
  .transform((venueIds) => [...new Set(venueIds)]);

const optionalVenueIdsSchema = z.array(
  z.string().trim().uuid('venue_ids must contain valid venue ids')
).optional()
  .default([])
  .transform((venueIds) => [...new Set(venueIds)]);

const createVenueAdminSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long').max(100),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: passwordSchema,
  venue_ids: optionalVenueIdsSchema
});

const assignVenuesSchema = z.object({
  venue_ids: venueIdsSchema
});

const venueAdminIdSchema = z.string().trim().uuid('venueAdminId must be a valid user id');

const USER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true
};

function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function serializeUserWithVenues(user, venues) {
  return {
    ...serializeUser(user),
    venues: venues.map(serializeVenue)
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

async function createVenueAdmin(payload, actor) {
  const input = validateSchema(createVenueAdminSchema, payload);
  await ensureEmailIsAvailable(input.email);

  const hashedPassword = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const venues = input.venue_ids.length
      ? await findAccessibleVenues(tx, input.venue_ids, actor)
      : [];

    const user = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hashedPassword,
        role: ROLES.VENUE_ADMIN
      },
      select: USER_SAFE_SELECT
    });

    if (input.venue_ids.length) {
      await tx.venueAdmin.createMany({
        data: input.venue_ids.map((venueId) => ({
          venueId,
          adminId: user.id,
          assignedById: actor.id
        })),
        skipDuplicates: true
      });
    }

    return serializeUserWithVenues(user, venues);
  });
}

async function assignVenueAdminToVenues(venueAdminId, payload, actor) {
  const validatedVenueAdminId = validateSchema(venueAdminIdSchema, venueAdminId);
  const input = validateSchema(assignVenuesSchema, payload);

  return prisma.$transaction(async (tx) => {
    const venueAdmin = await tx.user.findUnique({
      where: { id: validatedVenueAdminId },
      select: USER_SAFE_SELECT
    });

    if (!venueAdmin || venueAdmin.role !== ROLES.VENUE_ADMIN) {
      throw new AppError('Venue admin user not found', HTTP_STATUS.NOT_FOUND);
    }

    const venues = await findAccessibleVenues(tx, input.venue_ids, actor);

    await tx.venueAdmin.deleteMany({
      where: {
        adminId: venueAdmin.id
      }
    });

    await tx.venueAdmin.createMany({
      data: input.venue_ids.map((venueId) => ({
        venueId,
        adminId: venueAdmin.id,
        assignedById: actor.id
      })),
      skipDuplicates: true
    });

    return serializeUserWithVenues(venueAdmin, venues);
  });
}

module.exports = {
  createVenueAdmin,
  assignVenueAdminToVenues
};
