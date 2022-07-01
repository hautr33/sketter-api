import compression from "compression";
import express from "express";
import { StatusCodes } from "http-status-codes";
import morganProd from "morgan";
import morganDev from "morgan-body";
import path from "path";
import { ENVIRONMENT, SESSION_SECRET } from "./utils/secrets";
import globalErrorHandler from './controllers/error/error.controller';
import AppError from "./utils/appError";
import authRoute from "./routes/auth.route";

const app = express();

// Hide X-Powered-By header
app.disable('x-powered-by');

// Compress requests
app.use(compression());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

var xss = require('xss-clean');
app.use(xss());

if (ENVIRONMENT === 'production' || ENVIRONMENT === 'test')
  app.use(morganProd('common'));
else morganDev(app);


// App Route
app.use('/api/v1/auth', authRoute);



/* -------------ERROR HANDLERS MIDDLEWARE---------------*/
// If not handle by other router, implement 404 Router
app.all('*', (req, res, next) => {
  /* NOTE Express will assume anything inside next() as an error
  it will skip all middlewares in middleware statck, and Handling with
  global error handler */
  if (!res.headersSent) {
    next(
      new AppError(
        `Cannot find ${req.originalUrl} on server!`,
        StatusCodes.NOT_FOUND
      )
    );
  }

  res.end();
});

// Error Middleware Handler
app.use(globalErrorHandler);
/* -----------------------------------------------------*/

export default app;