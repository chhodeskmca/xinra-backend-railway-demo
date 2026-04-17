const { z } = require('zod');
const prisma = require('../../config/db');
const { HTTP_STATUS } = require('../../shared/constants/httpStatus');
const { ROLES } = require('../../shared/constants/roles');
const { AppError } = require('../../shared/utils/appError');
const { validateSchema } = require('../../shared/utils/validation');

const PLATFORM_FEE_PERCENT = 3;
const DEFAULT_CURRENCY = 'AUD';

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

const submitTipReviewSchema = z.object({
  qr_token: z.string().trim().min(1, 'qr_token is required').max(128),
  staff_id: z.string().trim().uuid('staff_id must be a valid user id'),
  tip_amount: z.preprocess((value) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    return Number(value);
  }, z.number({
    invalid_type_error: 'tip_amount must be a valid number'
  })
    .positive('tip_amount must be greater than 0')
    .max(100000, 'tip_amount must be at most 100000')
    .refine((value) => Number.isInteger(value * 100), 'tip_amount must have at most 2 decimal places')
    .optional()),
  rating: z.preprocess((value) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    return Number(value);
  }, z.number({
    invalid_type_error: 'rating must be a valid number'
  })
    .int('rating must be an integer')
    .min(1, 'rating must be at least 1')
    .max(5, 'rating must be at most 5')
    .optional()),
  comment: optionalString(1000)
}).superRefine((input, ctx) => {
  const hasTip = input.tip_amount !== undefined;
  const hasRating = input.rating !== undefined;
  const hasComment = input.comment !== undefined;

  if (!hasTip && !hasRating) {
    ctx.addIssue({
      code: 'custom',
      path: ['rating'],
      message: 'Either tip_amount or rating is required'
    });
  }

  if (hasComment && !hasRating) {
    ctx.addIssue({
      code: 'custom',
      path: ['rating'],
      message: 'rating is required when comment is provided'
    });
  }
});

function toMinorUnits(amount) {
  return Math.round(Number(amount) * 100);
}

function fromMinorUnits(amount) {
  return Number((amount / 100).toFixed(2));
}

function calculateTipAmounts(totalAmount) {
  const totalAmountMinor = toMinorUnits(totalAmount);

  if (totalAmountMinor <= 0) {
    throw new AppError('tip_amount must be greater than 0', HTTP_STATUS.BAD_REQUEST);
  }

  const platformEarnAmountMinor = Math.round(totalAmountMinor * (PLATFORM_FEE_PERCENT / 100));
  const staffEarnAmountMinor = totalAmountMinor - platformEarnAmountMinor;

  return {
    total_amount: fromMinorUnits(totalAmountMinor),
    platform_fee: PLATFORM_FEE_PERCENT,
    platform_earn_amount: fromMinorUnits(platformEarnAmountMinor),
    staff_earn_amount: fromMinorUnits(staffEarnAmountMinor),
    currency: DEFAULT_CURRENCY
  };
}

function toSerializableNumber(value) {
  return value === null || value === undefined ? value : Number(value);
}

function serializeTipTransaction(tipTransaction) {
  if (!tipTransaction) {
    return null;
  }

  return {
    id: tipTransaction.id,
    venue_id: tipTransaction.venueId,
    staff_id: tipTransaction.staffId,
    total_amount: toSerializableNumber(tipTransaction.totalAmount),
    platform_fee: tipTransaction.platformFee,
    platform_earn_amount: toSerializableNumber(tipTransaction.platformEarnAmount),
    staff_earn_amount: toSerializableNumber(tipTransaction.staffEarnAmount),
    currency: tipTransaction.currency,
    status: tipTransaction.status,
    stripe_payment_intent_id: tipTransaction.stripePaymentIntentId,
    createdAt: tipTransaction.createdAt,
    updatedAt: tipTransaction.updatedAt
  };
}

function serializeStaffReview(review) {
  if (!review) {
    return null;
  }

  return {
    id: review.id,
    venue_id: review.venueId,
    staff_id: review.staffId,
    tip_id: review.tipId,
    rating: review.rating,
    comment: review.comment,
    status: review.status,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt
  };
}

function buildSubmissionType({ hasTip, hasReview }) {
  if (hasTip && hasReview) {
    return 'TIP_AND_REVIEW';
  }

  if (hasTip) {
    return 'TIP_ONLY';
  }

  return 'REVIEW_ONLY';
}

async function getVenueByQrTokenOrFail(tx, qrToken) {
  const venue = await tx.venue.findUnique({
    where: { qrToken },
    select: {
      id: true,
      name: true
    }
  });

  if (!venue) {
    throw new AppError('Venue not found for this QR token', HTTP_STATUS.NOT_FOUND);
  }

  return venue;
}

async function getAssignedStaffForVenueOrFail(tx, venueId, staffId) {
  const assignment = await tx.staffVenue.findFirst({
    where: {
      venueId,
      staffId,
      staff: {
        role: ROLES.STAFF
      }
    },
    select: {
      staff: {
        select: {
          id: true,
          name: true,
          stripeAccountId: true
        }
      }
    }
  });

  if (!assignment) {
    throw new AppError('Staff user is not assigned to this venue', HTTP_STATUS.BAD_REQUEST);
  }

  return assignment.staff;
}

async function submitTipReview(payload) {
  const input = validateSchema(submitTipReviewSchema, payload);
  const hasTip = input.tip_amount !== undefined;
  const hasReview = input.rating !== undefined;
  const submissionType = buildSubmissionType({ hasTip, hasReview });

  return prisma.$transaction(async (tx) => {
    const venue = await getVenueByQrTokenOrFail(tx, input.qr_token);
    const staff = await getAssignedStaffForVenueOrFail(tx, venue.id, input.staff_id);

    let tipTransaction = null;
    let review = null;

    if (hasTip) {
      const amounts = calculateTipAmounts(input.tip_amount);

      tipTransaction = await tx.tipTransaction.create({
        data: {
          venueId: venue.id,
          staffId: staff.id,
          totalAmount: amounts.total_amount,
          platformFee: amounts.platform_fee,
          platformEarnAmount: amounts.platform_earn_amount,
          staffEarnAmount: amounts.staff_earn_amount,
          currency: amounts.currency,
          status: 'RECORDED',
          destinationStripeAccountId: staff.stripeAccountId ?? null
        }
      });

      /*
      Future Stripe Connect flow for direct staff payouts:

      const {
        getStripeClient,
        toStripeMinorUnits
      } = require('../../shared/integrations/stripe');

      const stripe = getStripeClient();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: toStripeMinorUnits(amounts.total_amount),
        currency: amounts.currency.toLowerCase(),
        application_fee_amount: toStripeMinorUnits(amounts.platform_earn_amount),
        transfer_data: {
          destination: staff.stripeAccountId
        },
        metadata: {
          venue_id: venue.id,
          staff_id: staff.id,
          tip_transaction_id: tipTransaction.id,
          submission_type: submissionType
        }
      });

      tipTransaction = await tx.tipTransaction.update({
        where: { id: tipTransaction.id },
        data: {
          status: 'PENDING_PAYMENT',
          stripePaymentIntentId: paymentIntent.id
        }
      });
      */
    }

    if (hasReview) {
      review = await tx.staffReview.create({
        data: {
          venueId: venue.id,
          staffId: staff.id,
          tipId: tipTransaction?.id ?? null,
          rating: input.rating,
          comment: input.comment ?? null,
          status: 'ACTIVE'
        }
      });
    }

    return {
      type: submissionType,
      venue: {
        id: venue.id,
        name: venue.name
      },
      staff: {
        id: staff.id,
        name: staff.name
      },
      tip_transaction: serializeTipTransaction(tipTransaction),
      review: serializeStaffReview(review)
    };
  });
}

module.exports = {
  submitTipReview,
  calculateTipAmounts
};
