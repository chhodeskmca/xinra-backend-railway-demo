const swaggerUi = require('swagger-ui-express');
const { env } = require('../config/env');

const successEnvelope = (dataSchema) => ({
  allOf: [
    { $ref: '#/components/schemas/ApiSuccess' },
    {
      type: 'object',
      properties: {
        data: dataSchema
      }
    }
  ]
});

const paginatedSuccessEnvelope = (dataSchema, metaSchema) => ({
  allOf: [
    successEnvelope(dataSchema),
    {
      type: 'object',
      properties: {
        meta: metaSchema
      }
    }
  ]
});

function formatBytesForDocs(bytes) {
  const sizeInMb = bytes / (1024 * 1024);

  return Number.isInteger(sizeInMb) ? `${sizeInMb}MB` : `${bytes} bytes`;
}

const STAFF_IMAGE_MAX_SIZE_LABEL = formatBytesForDocs(env.staffImageMaxBytes);
const STAFF_IMAGE_ALLOWED_TYPES_LABEL = 'image/jpeg, image/png';
const STAFF_IMAGE_VALIDATION_DESCRIPTION = `Optional staff profile image. Use the multipart field name "profile_image". Allowed MIME types: ${STAFF_IMAGE_ALLOWED_TYPES_LABEL}. Max size: ${STAFF_IMAGE_MAX_SIZE_LABEL}. The backend also validates the JPEG/PNG file signature against the uploaded bytes.`;
const STAFF_MULTIPART_VENUE_IDS_DESCRIPTION = 'For multipart/form-data, send venue_ids as repeated "venue_ids" fields. The backend also accepts repeated "venue_ids[]" fields, a JSON array string, or a comma-separated string for compatibility.';
const STAFF_CREATE_VENUE_IDS_DESCRIPTION = 'Optional. When provided, the staff member is assigned to these accessible venue UUIDs during creation. If omitted, the staff member is created without venue assignments. Assign venues later with POST /api/v1/staff/{staffId}/venues.';
const STAFF_CREATE_MULTIPART_VENUE_IDS_DESCRIPTION = `Optional. ${STAFF_MULTIPART_VENUE_IDS_DESCRIPTION} When provided, the staff member is assigned to those accessible venues during creation. If omitted, the staff member is created without venue assignments. Assign venues later with POST /api/v1/staff/{staffId}/venues.`;
const STAFF_UPDATE_VENUE_IDS_DESCRIPTION = 'Optional. Sending venue_ids replaces the full venue assignment list for the staff member. Omit this field to keep the current assignments unchanged.';
const STAFF_UPDATE_MULTIPART_VENUE_IDS_DESCRIPTION = `Optional. ${STAFF_MULTIPART_VENUE_IDS_DESCRIPTION} Sending venue_ids replaces the full venue assignment list. Omit this field to keep the current assignments unchanged.`;
const STAFF_IMAGE_RESPONSE_DESCRIPTION = 'Null when no image is stored. When present, the url is a temporary AWS S3 pre-signed GET URL. Refetch the staff record after expiry to receive a fresh url.';

const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Xinra Backend API',
    version: '1.0.0',
    description: 'Authentication, dashboard stats, venue creation, QR venue lookup, tip/review submission, and role-based user management APIs.'
  },
  tags: [
    { name: 'Auth' },
    { name: 'Stats' },
    { name: 'Tip Reviews' },
    { name: 'Users' },
    { name: 'Staff' },
    { name: 'Venues' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      ApiSuccess: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Success' },
          data: { nullable: true },
          meta: { nullable: true, example: null }
        }
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed' },
          errors: { nullable: true },
          data: { nullable: true, example: null }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          stripe_account_id: { type: 'string', nullable: true, example: 'acct_1ExampleStaffStripe' },
          role: {
            type: 'string',
            enum: ['ADMIN', 'VENUE_ADMIN', 'STAFF']
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      StaffProfileImage: {
        type: 'object',
        nullable: true,
        description: STAFF_IMAGE_RESPONSE_DESCRIPTION,
        properties: {
          key: {
            type: 'string',
            example: 'staff/9f2c1e9d-7a8e-4ec8-b2d9-5c2d7f3a1a11/profile/3fa85f64.jpg'
          },
          url: {
            type: 'string',
            format: 'uri',
            description: 'Temporary AWS S3 pre-signed GET URL for secure image retrieval.'
          },
          url_type: {
            type: 'string',
            enum: ['AWS_S3_PRE_SIGNED_GET'],
            example: 'AWS_S3_PRE_SIGNED_GET'
          },
          expires_in: { type: 'integer', example: env.s3ReadUrlExpiresSeconds },
          expires_at: { type: 'string', format: 'date-time' },
          content_type: {
            type: 'string',
            enum: ['image/jpeg', 'image/png'],
            example: 'image/jpeg'
          },
          size_bytes: {
            type: 'integer',
            maximum: env.staffImageMaxBytes,
            example: 248193
          },
          uploaded_at: { type: 'string', format: 'date-time', nullable: true }
        }
      },
      Venue: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Venue A' },
          address: { type: 'string', nullable: true, example: '123 Collins Street, Melbourne VIC' },
          email: { type: 'string', format: 'email', nullable: true, example: 'venue.a@example.com' },
          telephone_number: { type: 'string', nullable: true, example: '+61 3 9000 0000' },
          stripe_account_id: { type: 'string', nullable: true, example: 'acct_123456789' },
          australian_business_number: { type: 'string', nullable: true, example: '51824753556' },
          qr_token: { type: 'string', example: '4d5bb66f9bb44af5d6dbf2937f389fbf05cd6a2f246f8c36bb8b3c2b8c4df83f' },
          qr_scan_url: { type: 'string', example: 'https://app.example.com/4d5bb66f9bb44af5d6dbf2937f389fbf05cd6a2f246f8c36bb8b3c2b8c4df83f' },
          created_by_id: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      VenueAdminSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Venue Admin' },
          email: { type: 'string', format: 'email', example: 'venue.admin@example.com' }
        }
      },
      AuthenticatedVenue: {
        allOf: [
          { $ref: '#/components/schemas/Venue' },
          {
            type: 'object',
            properties: {
              admins: {
                type: 'array',
                items: { $ref: '#/components/schemas/VenueAdminSummary' }
              },
              admin_count: { type: 'integer', example: 2 },
              staff_count: { type: 'integer', example: 5 }
            }
          }
        ]
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 57 },
          total_pages: { type: 'integer', example: 3 },
          has_next_page: { type: 'boolean', example: true },
          has_previous_page: { type: 'boolean', example: false }
        }
      },
      PublicStaff: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Staff User' }
        }
      },
      PublicVenueDetails: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Venue A' },
          address: { type: 'string', nullable: true, example: '123 Collins Street, Melbourne VIC' },
          email: { type: 'string', format: 'email', nullable: true, example: 'venue.a@example.com' },
          telephone_number: { type: 'string', nullable: true, example: '+61 3 9000 0000' },
          qr_token: { type: 'string', example: '4d5bb66f9bb44af5d6dbf2937f389fbf05cd6a2f246f8c36bb8b3c2b8c4df83f' },
          qr_scan_url: { type: 'string', example: 'https://app.example.com/4d5bb66f9bb44af5d6dbf2937f389fbf05cd6a2f246f8c36bb8b3c2b8c4df83f' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          staff: {
            type: 'array',
            items: { $ref: '#/components/schemas/PublicStaff' }
          }
        }
      },
      UserWithVenues: {
        allOf: [
          { $ref: '#/components/schemas/User' },
          {
            type: 'object',
            properties: {
              venues: {
                type: 'array',
                items: { $ref: '#/components/schemas/Venue' }
              }
            }
          }
        ]
      },
      Staff: {
        allOf: [
          { $ref: '#/components/schemas/User' },
          {
            type: 'object',
            properties: {
              venue_count: { type: 'integer', example: 2 },
              profile_image: { $ref: '#/components/schemas/StaffProfileImage' },
              venues: {
                type: 'array',
                items: { $ref: '#/components/schemas/Venue' }
              }
            }
          }
        ]
      },
      TipTransaction: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          venue_id: { type: 'string', format: 'uuid' },
          staff_id: { type: 'string', format: 'uuid' },
          total_amount: { type: 'number', format: 'float', example: 20.0 },
          platform_fee: { type: 'integer', example: 3 },
          platform_earn_amount: { type: 'number', format: 'float', example: 0.6 },
          staff_earn_amount: { type: 'number', format: 'float', example: 19.4 },
          currency: { type: 'string', example: 'AUD' },
          status: {
            type: 'string',
            enum: ['RECORDED', 'PENDING_PAYMENT', 'SUCCEEDED', 'FAILED', 'CANCELED'],
            example: 'RECORDED'
          },
          stripe_payment_intent_id: {
            type: 'string',
            nullable: true,
            example: null
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      StaffReview: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          venue_id: { type: 'string', format: 'uuid' },
          staff_id: { type: 'string', format: 'uuid' },
          tip_id: { type: 'string', format: 'uuid', nullable: true },
          rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
          comment: { type: 'string', nullable: true, example: 'Excellent service' },
          status: {
            type: 'string',
            enum: ['ACTIVE', 'PENDING_PAYMENT', 'CANCELED'],
            example: 'ACTIVE'
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      DashboardMoneyValue: {
        type: 'object',
        properties: {
          amount: { type: 'number', format: 'float', example: 30.0 },
          currency: { type: 'string', example: 'AUD' }
        }
      },
      AdminDashboardStatsSummary: {
        type: 'object',
        properties: {
          total_venue_user_count: { type: 'integer', example: 12 },
          total_staff_user_count: { type: 'integer', example: 48 },
          total_venues: { type: 'integer', example: 9 }
        }
      },
      VenueAdminDashboardStatsSummary: {
        type: 'object',
        properties: {
          total_venue_count: { type: 'integer', example: 3 },
          total_staff_count: { type: 'integer', example: 7 },
          total_venue_earning: { $ref: '#/components/schemas/DashboardMoneyValue' }
        }
      },
      StaffDashboardStatsSummary: {
        type: 'object',
        properties: {
          total_earning: { $ref: '#/components/schemas/DashboardMoneyValue' },
          rating_avg: {
            type: 'number',
            format: 'float',
            nullable: true,
            example: 4.67
          }
        }
      },
      AdminDashboardStats: {
        type: 'object',
        properties: {
          role: {
            type: 'string',
            enum: ['ADMIN'],
            example: 'ADMIN'
          },
          generated_at: { type: 'string', format: 'date-time' },
          summary: { $ref: '#/components/schemas/AdminDashboardStatsSummary' }
        }
      },
      VenueAdminDashboardStats: {
        type: 'object',
        properties: {
          role: {
            type: 'string',
            enum: ['VENUE_ADMIN'],
            example: 'VENUE_ADMIN'
          },
          generated_at: { type: 'string', format: 'date-time' },
          summary: { $ref: '#/components/schemas/VenueAdminDashboardStatsSummary' }
        }
      },
      StaffDashboardStats: {
        type: 'object',
        properties: {
          role: {
            type: 'string',
            enum: ['STAFF'],
            example: 'STAFF'
          },
          generated_at: { type: 'string', format: 'date-time' },
          summary: { $ref: '#/components/schemas/StaffDashboardStatsSummary' }
        }
      },
      TipReviewVenueSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Xinra Cafe' }
        }
      },
      TipReviewStaffSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'John' }
        }
      },
      TipReviewSubmission: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['TIP_ONLY', 'REVIEW_ONLY', 'TIP_AND_REVIEW'],
            example: 'TIP_AND_REVIEW'
          },
          venue: { $ref: '#/components/schemas/TipReviewVenueSummary' },
          staff: { $ref: '#/components/schemas/TipReviewStaffSummary' },
          tip_transaction: {
            allOf: [
              { $ref: '#/components/schemas/TipTransaction' }
            ],
            nullable: true
          },
          review: {
            allOf: [
              { $ref: '#/components/schemas/StaffReview' }
            ],
            nullable: true
          }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@example.com' },
          password: { type: 'string', format: 'password', example: 'ChangeMe123!' }
        }
      },
      CreateVenueAdminRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'Venue Admin' },
          email: { type: 'string', format: 'email', example: 'venue.admin@example.com' },
          password: { type: 'string', format: 'password', example: 'ChangeMe123!' },
          venue_ids: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            example: ['82b60c1f-1e61-4389-bd7f-7e4fc604adbf']
          }
        }
      },
      CreateVenueRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', example: 'Venue A' },
          address: { type: 'string', example: '123 Collins Street, Melbourne VIC' },
          email: { type: 'string', format: 'email', example: 'venue.a@example.com' },
          telephone_number: { type: 'string', example: '+61 3 9000 0000' },
          stripe_account_id: { type: 'string', example: 'acct_123456789' },
          australian_business_number: { type: 'string', example: '51824753556' }
        }
      },
      UpdateVenueRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Venue A Updated' },
          address: { type: 'string', nullable: true, example: '100 Queen Street, Melbourne VIC' },
          email: { type: 'string', format: 'email', nullable: true, example: 'updated.venue@example.com' },
          telephone_number: { type: 'string', nullable: true, example: '+61 3 9000 1111' },
          stripe_account_id: { type: 'string', nullable: true, example: 'acct_987654321' },
          australian_business_number: { type: 'string', nullable: true, example: '51824753556' }
        }
      },
      CreateStaffRequest: {
        type: 'object',
        description: 'JSON request body for creating a staff member when no profile image upload is needed. venue_ids is optional for standalone staff creation.',
        required: ['name', 'email', 'password'],
        example: {
          name: 'Staff User',
          email: 'staff@example.com',
          password: 'ChangeMe123!',
          stripe_account_id: 'acct_1ExampleStaffStripe'
        },
        properties: {
          name: { type: 'string', example: 'Staff User' },
          email: { type: 'string', format: 'email', example: 'staff@example.com' },
          password: { type: 'string', format: 'password', example: 'ChangeMe123!' },
          stripe_account_id: { type: 'string', nullable: true, example: 'acct_1ExampleStaffStripe' },
          venue_ids: {
            type: 'array',
            minItems: 1,
            items: { type: 'string', format: 'uuid' },
            description: STAFF_CREATE_VENUE_IDS_DESCRIPTION,
            example: ['82b60c1f-1e61-4389-bd7f-7e4fc604adbf']
          }
        }
      },
      CreateStaffMultipartRequest: {
        type: 'object',
        description: 'Multipart request body for creating a staff member with or without profile_image upload. venue_ids is optional for standalone staff creation.',
        required: ['name', 'email', 'password'],
        example: {
          name: 'Staff User',
          email: 'staff@example.com',
          password: 'ChangeMe123!',
          stripe_account_id: 'acct_1ExampleStaffStripe',
          profile_image: '(optional binary file)'
        },
        properties: {
          name: { type: 'string', example: 'Staff User' },
          email: { type: 'string', format: 'email', example: 'staff@example.com' },
          password: { type: 'string', format: 'password', example: 'ChangeMe123!' },
          stripe_account_id: { type: 'string', nullable: true, example: 'acct_1ExampleStaffStripe' },
          venue_ids: {
            type: 'array',
            minItems: 1,
            items: { type: 'string', format: 'uuid' },
            description: STAFF_CREATE_MULTIPART_VENUE_IDS_DESCRIPTION,
            example: ['82b60c1f-1e61-4389-bd7f-7e4fc604adbf']
          },
          profile_image: {
            type: 'string',
            format: 'binary',
            description: STAFF_IMAGE_VALIDATION_DESCRIPTION
          }
        }
      },
      UpdateStaffRequest: {
        type: 'object',
        description: 'JSON request body for updating staff fields. Provide at least one mutable field.',
        properties: {
          name: { type: 'string', example: 'Updated Staff User' },
          email: { type: 'string', format: 'email', example: 'updated.staff@example.com' },
          password: { type: 'string', format: 'password', example: 'NewPassword123!' },
          stripe_account_id: { type: 'string', nullable: true, example: 'acct_1ExampleStaffStripe' },
          venue_ids: {
            type: 'array',
            minItems: 1,
            items: { type: 'string', format: 'uuid' },
            description: STAFF_UPDATE_VENUE_IDS_DESCRIPTION,
            example: ['82b60c1f-1e61-4389-bd7f-7e4fc604adbf']
          }
        }
      },
      UpdateStaffMultipartRequest: {
        type: 'object',
        description: 'Multipart request body for updating staff fields and/or replacing the profile image. At least one mutable field or profile_image is required.',
        example: {
          name: 'Updated Staff User',
          stripe_account_id: 'acct_1ExampleStaffStripe',
          venue_ids: ['82b60c1f-1e61-4389-bd7f-7e4fc604adbf'],
          profile_image: '(optional binary file)'
        },
        properties: {
          name: { type: 'string', example: 'Updated Staff User' },
          email: { type: 'string', format: 'email', example: 'updated.staff@example.com' },
          password: { type: 'string', format: 'password', example: 'NewPassword123!' },
          stripe_account_id: { type: 'string', nullable: true, example: 'acct_1ExampleStaffStripe' },
          venue_ids: {
            type: 'array',
            minItems: 1,
            items: { type: 'string', format: 'uuid' },
            description: STAFF_UPDATE_MULTIPART_VENUE_IDS_DESCRIPTION,
            example: ['82b60c1f-1e61-4389-bd7f-7e4fc604adbf']
          },
          profile_image: {
            type: 'string',
            format: 'binary',
            description: `${STAFF_IMAGE_VALIDATION_DESCRIPTION} Uploading a new image replaces the previous S3 object after a successful update. Omit this field to keep the current image.`
          }
        }
      },
      AssignStaffVenuesRequest: {
        type: 'object',
        required: ['venue_ids'],
        properties: {
          venue_ids: {
            type: 'array',
            minItems: 1,
            items: { type: 'string', format: 'uuid' },
            example: [
              '82b60c1f-1e61-4389-bd7f-7e4fc604adbf',
              '8fd578d5-1c0f-4c30-aac6-9f7d0f9a9d3a'
            ]
          }
        }
      },
      AssignVenueAdminVenuesRequest: {
        type: 'object',
        required: ['venue_ids'],
        properties: {
          venue_ids: {
            type: 'array',
            minItems: 1,
            items: { type: 'string', format: 'uuid' },
            example: [
              '82b60c1f-1e61-4389-bd7f-7e4fc604adbf',
              '8fd578d5-1c0f-4c30-aac6-9f7d0f9a9d3a'
            ]
          }
        }
      },
      SubmitTipReviewRequest: {
        type: 'object',
        required: ['qr_token', 'staff_id'],
        properties: {
          qr_token: {
            type: 'string',
            example: '4d5bb66f9bb44af5d6dbf2937f389fbf05cd6a2f246f8c36bb8b3c2b8c4df83f'
          },
          staff_id: {
            type: 'string',
            format: 'uuid',
            example: '82b60c1f-1e61-4389-bd7f-7e4fc604adbf'
          },
          tip_amount: {
            type: 'number',
            format: 'float',
            nullable: true,
            example: 20.0,
            description: 'Optional. Provide for tip-only or tip+review submissions.'
          },
          rating: {
            type: 'integer',
            minimum: 1,
            maximum: 5,
            nullable: true,
            example: 5,
            description: 'Optional, but required if comment is provided.'
          },
          comment: {
            type: 'string',
            nullable: true,
            example: 'Very friendly service'
          }
        }
      }
    }
  },
  paths: {
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: successEnvelope({
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' }
                  }
                })
              }
            }
          },
          400: { description: 'Validation failed' },
          401: { description: 'Invalid credentials' }
        }
      }
    },
    '/api/v1/stats/dashboard': {
      get: {
        tags: ['Stats'],
        summary: 'Fetch dashboard stats for the authenticated user role',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Dashboard stats fetched successfully',
            content: {
              'application/json': {
                schema: successEnvelope({
                  oneOf: [
                    { $ref: '#/components/schemas/AdminDashboardStats' },
                    { $ref: '#/components/schemas/VenueAdminDashboardStats' },
                    { $ref: '#/components/schemas/StaffDashboardStats' }
                  ]
                })
              }
            }
          },
          401: { description: 'Authentication token is required or invalid' },
          403: { description: 'You do not have permission to view dashboard stats' }
        }
      }
    },
    '/api/v1/tip-reviews': {
      post: {
        tags: ['Tip Reviews'],
        summary: 'Submit a tip, review, or both for a staff member from a venue QR flow',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SubmitTipReviewRequest' }
            }
          }
        },
        responses: {
          201: {
            description: 'Tip/review submitted successfully',
            content: {
              'application/json': {
                schema: successEnvelope({ $ref: '#/components/schemas/TipReviewSubmission' })
              }
            }
          },
          400: {
            description: 'Validation failed, staff is not assigned to the venue, or neither tip_amount nor rating was provided'
          },
          404: { description: 'Venue not found for this QR token' }
        }
      }
    },
    '/api/v1/venues': {
      get: {
        tags: ['Venues'],
        summary: 'List venues',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'page',
            schema: { type: 'integer', minimum: 1, default: 1 }
          },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
          },
          {
            in: 'query',
            name: 'search',
            schema: { type: 'string', maxLength: 100 },
            description: 'Searches name, address, email, phone, stripe account id, and ABN.'
          },
          {
            in: 'query',
            name: 'created_by_id',
            schema: { type: 'string', format: 'uuid' }
          },
          {
            in: 'query',
            name: 'venue_admin_id',
            schema: { type: 'string', format: 'uuid' }
          },
          {
            in: 'query',
            name: 'sort_by',
            schema: {
              type: 'string',
              enum: ['created_at', 'updated_at', 'name'],
              default: 'created_at'
            }
          },
          {
            in: 'query',
            name: 'sort_order',
            schema: {
              type: 'string',
              enum: ['asc', 'desc'],
              default: 'desc'
            }
          }
        ],
        responses: {
          200: {
            description: 'Venues fetched successfully',
            content: {
              'application/json': {
                schema: paginatedSuccessEnvelope(
                  {
                    type: 'array',
                    items: { $ref: '#/components/schemas/AuthenticatedVenue' }
                  },
                  { $ref: '#/components/schemas/PaginationMeta' }
                )
              }
            }
          },
          400: { description: 'Validation failed' },
          401: { description: 'Authentication token is required or invalid' },
          403: { description: 'Only ADMIN or VENUE_ADMIN can view venues' }
        }
      },
      post: {
        tags: ['Venues'],
        summary: 'Create venue',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateVenueRequest' }
            }
          }
        },
        responses: {
          201: {
            description: 'Venue created successfully',
            content: {
              'application/json': {
                schema: successEnvelope({ $ref: '#/components/schemas/AuthenticatedVenue' })
              }
            }
          },
          400: { description: 'Validation failed' },
          401: { description: 'Authentication token is required or invalid' },
          403: { description: 'Only ADMIN or VENUE_ADMIN can create venues' }
        }
      }
    },
    '/api/v1/venues/qr/{qrToken}': {
      get: {
        tags: ['Venues'],
        summary: 'Get venue details from QR token',
        parameters: [
          {
            in: 'path',
            name: 'qrToken',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: {
            description: 'Venue details fetched successfully',
            content: {
              'application/json': {
                schema: successEnvelope({ $ref: '#/components/schemas/PublicVenueDetails' })
              }
            }
          },
          404: { description: 'Venue not found for this QR token' }
        }
      }
    },
    '/api/v1/venues/{venueId}': {
      get: {
        tags: ['Venues'],
        summary: 'Get venue by id',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'venueId',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: {
          200: {
            description: 'Venue fetched successfully',
            content: {
              'application/json': {
                schema: successEnvelope({ $ref: '#/components/schemas/AuthenticatedVenue' })
              }
            }
          },
          401: { description: 'Authentication token is required or invalid' },
          404: { description: 'Venue not found' }
        }
      },
      patch: {
        tags: ['Venues'],
        summary: 'Update venue',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'venueId',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateVenueRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Venue updated successfully',
            content: {
              'application/json': {
                schema: successEnvelope({ $ref: '#/components/schemas/AuthenticatedVenue' })
              }
            }
          },
          400: { description: 'Validation failed' },
          401: { description: 'Authentication token is required or invalid' },
          404: { description: 'Venue not found' }
        }
      },
      delete: {
        tags: ['Venues'],
        summary: 'Delete venue',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'venueId',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: {
          200: {
            description: 'Venue deleted successfully',
            content: {
              'application/json': {
                schema: successEnvelope({ $ref: '#/components/schemas/AuthenticatedVenue' })
              }
            }
          },
          401: { description: 'Authentication token is required or invalid' },
          404: { description: 'Venue not found' }
        }
      }
    },
    '/api/v1/staff': {
      get: {
        tags: ['Staff'],
        summary: 'List staff',
        description: 'Returns staff members visible to the authenticated ADMIN or VENUE_ADMIN. Each staff item includes profile_image metadata when an image is stored.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'page',
            schema: { type: 'integer', minimum: 1, default: 1 }
          },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
          },
          {
            in: 'query',
            name: 'search',
            schema: { type: 'string', maxLength: 100 },
            description: 'Searches staff name and email.'
          },
          {
            in: 'query',
            name: 'venue_id',
            schema: { type: 'string', format: 'uuid' }
          },
          {
            in: 'query',
            name: 'sort_by',
            schema: {
              type: 'string',
              enum: ['created_at', 'updated_at', 'name', 'email'],
              default: 'created_at'
            }
          },
          {
            in: 'query',
            name: 'sort_order',
            schema: {
              type: 'string',
              enum: ['asc', 'desc'],
              default: 'desc'
            }
          }
        ],
        responses: {
          200: {
            description: 'Staff fetched successfully',
            content: {
              'application/json': {
                schema: paginatedSuccessEnvelope(
                  {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Staff' }
                  },
                  { $ref: '#/components/schemas/PaginationMeta' }
                )
              }
            }
          },
          400: { description: 'Validation failed or invalid venue_id' },
          401: { description: 'Authentication token is required or invalid' },
          403: { description: 'Only ADMIN or VENUE_ADMIN can view staff' }
        }
      },
      post: {
        tags: ['Staff'],
        summary: 'Create staff',
        description: 'Creates a STAFF user. venue_ids is optional: if provided, the backend assigns the staff member to those accessible venues during creation; if omitted, the staff member is created without venue assignments and can be assigned later with POST /api/v1/staff/{staffId}/venues.\n\nUse application/json when no image upload is needed. Use multipart/form-data when uploading profile_image. In multipart requests, send the file in the "profile_image" field and send venue_ids as repeated "venue_ids" fields. The backend also accepts repeated "venue_ids[]" fields, a JSON array string, or a comma-separated string for compatibility.\n\nIf profile_image is uploaded, the response includes private-image metadata plus a temporary AWS S3 pre-signed GET URL.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          description: `Send JSON for staff creation without an image, or multipart/form-data with profile_image for image upload. venue_ids is optional. Only one file is allowed. Profile images must be ${STAFF_IMAGE_ALLOWED_TYPES_LABEL}, ${STAFF_IMAGE_MAX_SIZE_LABEL} or smaller, and their file signature must match the declared type.`,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateStaffRequest' }
            },
            'multipart/form-data': {
              schema: { $ref: '#/components/schemas/CreateStaffMultipartRequest' },
              encoding: {
                venue_ids: {
                  style: 'form',
                  explode: true
                },
                profile_image: {
                  contentType: STAFF_IMAGE_ALLOWED_TYPES_LABEL
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Staff created successfully',
            content: {
              'application/json': {
                schema: successEnvelope({ $ref: '#/components/schemas/Staff' })
              }
            }
          },
          400: { description: `Validation failed, invalid venue_ids when provided, or invalid profile image upload. Only one profile_image file is allowed. Accepted image types are ${STAFF_IMAGE_ALLOWED_TYPES_LABEL}, max ${STAFF_IMAGE_MAX_SIZE_LABEL}, and the uploaded bytes must match the declared image type.` },
          401: { description: 'Authentication token is required or invalid' },
          403: { description: 'Only ADMIN or VENUE_ADMIN can create staff' },
          409: { description: 'Email is already in use' }
        }
      }
    },
    '/api/v1/staff/{staffId}': {
      get: {
        tags: ['Staff'],
        summary: 'Get staff by id',
        description: 'Returns one visible staff member, including current venue assignments and profile_image metadata when an image exists.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'staffId',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: {
          200: {
            description: 'Staff fetched successfully',
            content: {
              'application/json': {
                schema: successEnvelope({ $ref: '#/components/schemas/Staff' })
              }
            }
          },
          401: { description: 'Authentication token is required or invalid' },
          404: { description: 'Staff user not found' }
        }
      },
      patch: {
        tags: ['Staff'],
        summary: 'Update staff',
        description: 'Updates any subset of mutable staff fields: name, email, password, stripe_account_id, venue_ids, and/or profile_image.\n\nUse application/json when no image upload is needed. Use multipart/form-data when replacing profile_image. At least one mutable field or profile_image must be provided. Omitting profile_image keeps the current image. venue_ids is optional; when sent, it replaces the full venue assignment list, and when omitted, current assignments stay unchanged.\n\nIf a new image is uploaded, the backend validates MIME type, size, and JPEG/PNG file signature before upload, then deletes the previous S3 object after the update succeeds.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'staffId',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        requestBody: {
          required: true,
          description: `Send JSON for staff field updates without an image, or multipart/form-data with profile_image to replace the staff profile image. venue_ids is optional. Only one file is allowed. Profile images must be ${STAFF_IMAGE_ALLOWED_TYPES_LABEL}, ${STAFF_IMAGE_MAX_SIZE_LABEL} or smaller, and their file signature must match the declared type.`,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateStaffRequest' }
            },
            'multipart/form-data': {
              schema: { $ref: '#/components/schemas/UpdateStaffMultipartRequest' },
              encoding: {
                venue_ids: {
                  style: 'form',
                  explode: true
                },
                profile_image: {
                  contentType: STAFF_IMAGE_ALLOWED_TYPES_LABEL
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Staff updated successfully',
            content: {
              'application/json': {
                schema: successEnvelope({ $ref: '#/components/schemas/Staff' })
              }
            }
          },
          400: { description: `Validation failed, invalid venue_ids when provided, or invalid profile image upload. Only one profile_image file is allowed. Accepted image types are ${STAFF_IMAGE_ALLOWED_TYPES_LABEL}, max ${STAFF_IMAGE_MAX_SIZE_LABEL}, and the uploaded bytes must match the declared image type.` },
          401: { description: 'Authentication token is required or invalid' },
          403: { description: 'Staff cannot be modified with the current access scope' },
          404: { description: 'Staff user not found' },
          409: { description: 'Email is already in use' }
        }
      },
      delete: {
        tags: ['Staff'],
        summary: 'Delete staff',
        description: 'Deletes the staff user. If the staff member has a stored profile image, the backend also deletes the image object from private S3.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'staffId',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: {
          200: {
            description: 'Staff deleted successfully',
            content: {
              'application/json': {
                schema: successEnvelope({ $ref: '#/components/schemas/Staff' })
              }
            }
          },
          401: { description: 'Authentication token is required or invalid' },
          403: { description: 'Staff cannot be deleted with the current access scope' },
          404: { description: 'Staff user not found' }
        }
      }
    },
    '/api/v1/staff/{staffId}/venues': {
      post: {
        tags: ['Staff'],
        summary: 'Assign venues to existing staff',
        description: 'Assigns one or more accessible venues to an existing staff member without removing current assignments. Use this after standalone staff creation when venue_ids was omitted from POST /api/v1/staff, or whenever you want to add venue access later.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'staffId',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AssignStaffVenuesRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Staff venues assigned successfully',
            content: {
              'application/json': {
                schema: successEnvelope({ $ref: '#/components/schemas/Staff' })
              }
            }
          },
          400: { description: 'Validation failed or invalid venue_ids' },
          401: { description: 'Authentication token is required or invalid' },
          403: { description: 'One or more venue_ids are not accessible' },
          404: { description: 'Staff user not found' }
        }
      }
    },
    '/api/v1/users/venue-admin': {
      post: {
        tags: ['Users'],
        summary: 'Create venue admin',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateVenueAdminRequest' }
            }
          }
        },
        responses: {
          201: {
            description: 'Venue admin created successfully',
            content: {
              'application/json': {
                schema: successEnvelope({ $ref: '#/components/schemas/UserWithVenues' })
              }
            }
          },
          400: { description: 'Validation failed' },
          401: { description: 'Authentication token is required or invalid' },
          403: { description: 'Only ADMIN can create venue admins' },
          409: { description: 'Email is already in use' }
        }
      }
    },
    '/api/v1/users/venue-admin/{venueAdminId}/venues': {
      post: {
        tags: ['Users'],
        summary: 'Assign venues to venue admin',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'venueAdminId',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AssignVenueAdminVenuesRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Venue admin venues assigned successfully',
            content: {
              'application/json': {
                schema: successEnvelope({ $ref: '#/components/schemas/UserWithVenues' })
              }
            }
          },
          400: { description: 'Validation failed or invalid venue ids' },
          401: { description: 'Authentication token is required or invalid' },
          403: { description: 'Only ADMIN can assign venue admin venues' },
          404: { description: 'Venue admin user not found' }
        }
      }
    },
    // '/api/v1/users/staff': {
    //   post: {
    //     tags: ['Users'],
    //     summary: 'Create staff and assign venues (compatibility route)',
    //     description: 'Legacy compatibility route. This endpoint accepts application/json only and does not support multipart/form-data or profile_image uploads. Use POST /api/v1/staff for staff image upload support.',
    //     security: [{ bearerAuth: [] }],
    //     requestBody: {
    //       required: true,
    //       description: 'JSON-only compatibility request. No profile_image field is supported on this route.',
    //       content: {
    //         'application/json': {
    //           schema: { $ref: '#/components/schemas/CreateStaffRequest' }
    //         }
    //       }
    //     },
    //     responses: {
    //       201: {
    //         description: 'Staff created successfully',
    //         content: {
    //           'application/json': {
    //             schema: successEnvelope({ $ref: '#/components/schemas/Staff' })
    //           }
    //         }
    //       },
    //       400: { description: 'Validation failed or invalid venue ids' },
    //       401: { description: 'Authentication token is required or invalid' },
    //       403: { description: 'Only ADMIN or VENUE_ADMIN can create staff' },
    //       409: { description: 'Email is already in use' }
    //     }
    //   }
    // },
    // '/api/v1/users/staff/{staffId}/venues': {
    //   post: {
    //     tags: ['Users'],
    //     summary: 'Assign venues to existing staff (compatibility route)',
    //     security: [{ bearerAuth: [] }],
    //     parameters: [
    //       {
    //         in: 'path',
    //         name: 'staffId',
    //         required: true,
    //         schema: { type: 'string', format: 'uuid' }
    //       }
    //     ],
    //     requestBody: {
    //       required: true,
    //       content: {
    //         'application/json': {
    //           schema: { $ref: '#/components/schemas/AssignStaffVenuesRequest' }
    //         }
    //       }
    //     },
    //     responses: {
    //       200: {
    //         description: 'Staff venues assigned successfully',
    //         content: {
    //           'application/json': {
    //             schema: successEnvelope({ $ref: '#/components/schemas/Staff' })
    //           }
    //         }
    //       },
    //       400: { description: 'Validation failed or invalid venue ids' },
    //       401: { description: 'Authentication token is required or invalid' },
    //       403: { description: 'One or more venue_ids are not accessible' },
    //       404: { description: 'Staff user not found' }
    //     }
    //   }
    // }
  }
};

module.exports = {
  swaggerUi,
  openApiDocument
};
