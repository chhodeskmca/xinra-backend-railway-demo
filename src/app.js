const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const authRoutes = require('./modules/auth/auth.routes');
const statsRoutes = require('./modules/stats/stats.routes');
const staffRoutes = require('./modules/staff/staff.routes');
const tipReviewRoutes = require('./modules/tipReview/tipReview.routes');
const userRoutes = require('./modules/user/user.routes');
const venueRoutes = require('./modules/venue/venue.routes');
const { swaggerUi, openApiDocument } = require('./docs/swagger');
const { scalarDocs } = require('./docs/scalar');
const { env } = require('./config/env');
const { notFoundHandler, errorHandler } = require('./shared/middleware/error.middleware');

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(cors(env.corsOrigin ? { origin: env.corsOrigin } : undefined));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.get('/docs', scalarDocs(openApiDocument));

const apiV1Router = express.Router();

apiV1Router.use('/auth', authRoutes);
apiV1Router.use('/stats', statsRoutes);
apiV1Router.use('/staff', staffRoutes);
apiV1Router.use('/tip-reviews', tipReviewRoutes);
apiV1Router.use('/users', userRoutes);
apiV1Router.use('/venues', venueRoutes);

app.use('/api/v1', apiV1Router);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
