const prisma = require('../../config/db');
const { HTTP_STATUS } = require('../../shared/constants/httpStatus');
const { ROLES } = require('../../shared/constants/roles');
const { AppError } = require('../../shared/utils/appError');
const { buildAccessibleVenueFilter } = require('../../shared/utils/venueAccess');

const INCLUDED_TIP_STATUSES = ['RECORDED', 'SUCCEEDED'];
const ACTIVE_REVIEW_STATUS = 'ACTIVE';
const DEFAULT_CURRENCY = 'AUD';

function roundToTwo(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(Number(value).toFixed(2));
}

function buildMoneyValue(amount) {
  return {
    amount: roundToTwo(amount) ?? 0,
    currency: DEFAULT_CURRENCY
  };
}

async function getAdminDashboardSummary() {
  const [totalVenueUserCount, totalStaffUserCount, totalVenues] = await prisma.$transaction([
    prisma.user.count({
      where: {
        role: ROLES.VENUE_ADMIN
      }
    }),
    prisma.user.count({
      where: {
        role: ROLES.STAFF
      }
    }),
    prisma.venue.count()
  ]);

  return {
    total_venue_user_count: totalVenueUserCount,
    total_staff_user_count: totalStaffUserCount,
    total_venues: totalVenues
  };
}

async function getVenueAdminDashboardSummary(actor) {
  const accessibleVenueFilter = buildAccessibleVenueFilter(actor);

  const [totalVenueCount, totalStaffCount, earningsAggregate] = await prisma.$transaction([
    prisma.venue.count({
      where: accessibleVenueFilter
    }),
    prisma.user.count({
      where: {
        role: ROLES.STAFF,
        staffVenueAssignments: {
          some: {
            venue: accessibleVenueFilter
          }
        }
      }
    }),
    prisma.tipTransaction.aggregate({
      where: {
        status: {
          in: INCLUDED_TIP_STATUSES
        },
        venue: accessibleVenueFilter
      },
      _sum: {
        totalAmount: true
      }
    })
  ]);

  return {
    total_venue_count: totalVenueCount,
    total_staff_count: totalStaffCount,
    total_venue_earning: buildMoneyValue(earningsAggregate._sum.totalAmount)
  };
}

async function getStaffDashboardSummary(actor) {
  const [earningsAggregate, reviewAggregate] = await prisma.$transaction([
    prisma.tipTransaction.aggregate({
      where: {
        staffId: actor.id,
        status: {
          in: INCLUDED_TIP_STATUSES
        }
      },
      _sum: {
        staffEarnAmount: true
      }
    }),
    prisma.staffReview.aggregate({
      where: {
        staffId: actor.id,
        status: ACTIVE_REVIEW_STATUS
      },
      _avg: {
        rating: true
      }
    })
  ]);

  return {
    total_earning: buildMoneyValue(earningsAggregate._sum.staffEarnAmount),
    rating_avg: roundToTwo(reviewAggregate._avg.rating)
  };
}

async function getDashboardStats(actor) {
  let summary;

  switch (actor.role) {
    case ROLES.ADMIN:
      summary = await getAdminDashboardSummary();
      break;
    case ROLES.VENUE_ADMIN:
      summary = await getVenueAdminDashboardSummary(actor);
      break;
    case ROLES.STAFF:
      summary = await getStaffDashboardSummary(actor);
      break;
    default:
      throw new AppError('You do not have permission to view dashboard stats', HTTP_STATUS.FORBIDDEN);
  }

  return {
    role: actor.role,
    generated_at: new Date().toISOString(),
    summary
  };
}

module.exports = {
  getDashboardStats
};
