const { HTTP_STATUS } = require('../constants/httpStatus');
const { ROLES } = require('../constants/roles');
const { AppError } = require('./appError');
const { buildQrScanUrl } = require('./venueQr');

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

function buildAccessibleVenueFilter(actor) {
  if (actor.role === ROLES.VENUE_ADMIN) {
    return {
      adminAssignments: {
        some: {
          adminId: actor.id
        }
      }
    };
  }

  return {};
}

async function findAccessibleVenues(tx, venueIds, actor) {
  const where = {
    id: { in: venueIds },
    ...buildAccessibleVenueFilter(actor)
  };

  const venues = await tx.venue.findMany({
    where,
    select: VENUE_SAFE_SELECT
  });

  if (venues.length !== venueIds.length) {
    const statusCode = actor.role === ROLES.ADMIN
      ? HTTP_STATUS.BAD_REQUEST
      : HTTP_STATUS.FORBIDDEN;

    throw new AppError('One or more venue_ids are invalid or not accessible', statusCode);
  }

  const venueById = new Map(venues.map((venue) => [venue.id, venue]));

  return venueIds.map((venueId) => venueById.get(venueId));
}

module.exports = {
  VENUE_SAFE_SELECT,
  serializeVenue,
  buildAccessibleVenueFilter,
  findAccessibleVenues
};
