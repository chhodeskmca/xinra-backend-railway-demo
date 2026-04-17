const swaggerUi = require('swagger-ui-express');

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

const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Xinra Backend API',
    version: '1.0.0',
    description: 'Authentication, venue creation, QR venue lookup, tip/review submission, and role-based user management APIs.'
  },
  tags: [
    { name: 'Auth' },
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
          qr_scan_url: { type: 'string', example: 'https://app.example.com/venue/scan/4d5bb66f9bb44af5d6dbf2937f389fbf05cd6a2f246f8c36bb8b3c2b8c4df83f' },
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
          qr_scan_url: { type: 'string', example: 'https://app.example.com/venue/scan/4d5bb66f9bb44af5d6dbf2937f389fbf05cd6a2f246f8c36bb8b3c2b8c4df83f' },
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
        required: ['name', 'email', 'password', 'venue_ids'],
        properties: {
          name: { type: 'string', example: 'Staff User' },
          email: { type: 'string', format: 'email', example: 'staff@example.com' },
          password: { type: 'string', format: 'password', example: 'ChangeMe123!' },
          stripe_account_id: { type: 'string', nullable: true, example: 'acct_1ExampleStaffStripe' },
          venue_ids: {
            type: 'array',
            minItems: 1,
            items: { type: 'string', format: 'uuid' },
            example: ['82b60c1f-1e61-4389-bd7f-7e4fc604adbf']
          }
        }
      },
      UpdateStaffRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Updated Staff User' },
          email: { type: 'string', format: 'email', example: 'updated.staff@example.com' },
          password: { type: 'string', format: 'password', example: 'NewPassword123!' },
          stripe_account_id: { type: 'string', nullable: true, example: 'acct_1ExampleStaffStripe' },
          venue_ids: {
            type: 'array',
            minItems: 1,
            items: { type: 'string', format: 'uuid' },
            example: ['82b60c1f-1e61-4389-bd7f-7e4fc604adbf']
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
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateStaffRequest' }
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
          400: { description: 'Validation failed or invalid venue_ids' },
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
              schema: { $ref: '#/components/schemas/UpdateStaffRequest' }
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
          400: { description: 'Validation failed or invalid venue_ids' },
          401: { description: 'Authentication token is required or invalid' },
          403: { description: 'Staff cannot be modified with the current access scope' },
          404: { description: 'Staff user not found' },
          409: { description: 'Email is already in use' }
        }
      },
      delete: {
        tags: ['Staff'],
        summary: 'Delete staff',
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
    '/api/v1/users/staff': {
      post: {
        tags: ['Users'],
        summary: 'Create staff and assign venues (compatibility route)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateStaffRequest' }
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
          400: { description: 'Validation failed or invalid venue ids' },
          401: { description: 'Authentication token is required or invalid' },
          403: { description: 'Only ADMIN or VENUE_ADMIN can create staff' },
          409: { description: 'Email is already in use' }
        }
      }
    },
    '/api/v1/users/staff/{staffId}/venues': {
      post: {
        tags: ['Users'],
        summary: 'Assign venues to existing staff (compatibility route)',
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
          400: { description: 'Validation failed or invalid venue ids' },
          401: { description: 'Authentication token is required or invalid' },
          403: { description: 'One or more venue_ids are not accessible' },
          404: { description: 'Staff user not found' }
        }
      }
    }
  }
};

module.exports = {
  swaggerUi,
  openApiDocument
};
