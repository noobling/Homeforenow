const express = require('express');
const path = require('path');
// const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const Raven = require('raven');
const enforce = require('express-sslify');
const mongoose = require('mongoose');

require('dotenv').config();
require('./app_server/models/db');
require('./app_server/config/passport');

const Service = mongoose.model('Service');
const index = require('./app_server/routes/index');
const services = require('./app_server/routes/services');

const app = express();

if (process.env.NODE_ENV === 'production') {
  app.use(enforce.HTTPS({ trustProtoHeader: true }));
}

// Must configure Raven before doing anything else with it
Raven.config(process.env.DSN).install();

// view engine setup
app.set('views', path.join(__dirname, 'app_server', 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

if (process.env.NODE_ENV === 'production') {
  app.use(session({
    secret: process.env.secret,
    resave: true,
    saveUninitialized: false,
    proxy: true, // Need to set this for heroku because it uses reverse proxies
    cookie: {
      secure: true, // TODO: set this to true once the website uses https
      httpOnly: true,
      maxAge: 3600000, // One hour
    },
  })); // SECRET SHOULD BE STORED IN ENVIRONMENT VARIABLES
} else {
  app.use(session({
    secret: 'randomsecret',
    resave: true,
    saveUninitialized: false,
    cookie: {
      secure: false, // TODO: set this to true once the website uses https
      httpOnly: true,
      maxAge: 3600000, // One hour
    },
  })); // SECRET SHOULD BE STORED IN ENVIRONMENT VARIABLES
}

app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash());

/**
 * Custom middleware
 *
 * Reference for middlware in express:
 *  http://expressjs.com/en/api.html#app.use
 */
/**
 * Adds data to the views using res.locals
 *
 * Reference:
 *  http://expressjs.com/en/api.html#res
 */
app.use((req, res, next) => {
  res.locals.messages = req.flash();
  res.locals.user = req.user;
  if (req.user && req.user.role === 'service_provider') {
    Service.find({ 
      _id: {
        $in: req.user.service
      } 
    }, (err, userServices) => {
      if (err) console.log(err);
      res.locals.services = userServices;
      next();
    });
  } else {
    next();
  }
});
/** End custom middleware */

/**
 * Use our routes defined in /routes/index.js
 *
 * Namespaced under '/'
 */
app.use('/', index);
app.use('/service', services);

// Send the errors to sentry
app.use(Raven.requestHandler());
app.use(Raven.errorHandler());

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
  next();
});

module.exports = app;
