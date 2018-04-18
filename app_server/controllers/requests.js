const mongoose = require('mongoose');

const Request = mongoose.model('Request');
const Service = mongoose.model('Service');
// const User = mongoose.model('User');

/**
 * Prints an error to the console and sends a json repsonse
 * that contains the error message.
 * @param  {Object} res    Express response object.
 * @param  {String} err    The error message.
 * @param  {number} status The HTTP status to set.
 */
function errorHandler(res, err, status) {
  if (err) {
    console.log('[ERROR] RequestsController: '.concat(err));
    res.status(status).json({ message: err });
  }
}

module.exports.addRequest = (req, res) => {
  console.log(req.body);

  Object.keys(req.body).forEach((key) => {
    console.log(key, req.body[key]);
    if (req.body[key] === '') {
      res.redirect('/');
    }
  });

  const request = new Request();

  request.firstName = req.body.fName;
  request.lastName = req.body.lName;
  request.gender = req.body.gender;
  request.dob = req.body.dob;
  request.hasChild = req.body.child === 'yes';
  request.isLongTerm = req.params.lengthOfStay === 'long_term';

  request.save((err, doc) => {
    if (err) {
      res.status(500).json({ message: err });
    } else {
      req.session.requestId = doc.id;
      req.session.coordinates = [req.body.long, req.body.lat];
      res.redirect(307, '/locations/'.concat(req.params.lengthOfStay));
    }
  });
};

module.exports.addPhoneToRequest = (req, res) => {
  console.log('yee');
  if (req.session.requestId) {
    console.log('yeet');
    // Add phone number to request
    Request.findOneAndUpdate(
      { _id: req.session.requestId },
      {
        $set:
        {
          phoneNumber: req.body.number,
          email: req.body.email,
        },
      },
      { runValidators: true, new: true },
      (err) => {
        if (err) {
          console.log('[ERROR] RequestsController: '.concat(err));
          res.status(500).json({ message: 'Could not add phone number to request.' });
        }
      },
    );
    // Add request to service
    Service.findOneAndUpdate(
      { _id: req.body.serviceId },
      { $push: { openRequests: req.session.requestId } },
      { runValidators: true, new: true },
      (err) => {
        if (err) {
          console.log('[ERROR] RequestsController: '.concat(err));
          res.status(500).json({ message: 'Could not submit request to service provider.' });
        }
      },
    );
  } else {
    // TODO: Handle this case
    //    Tell the user to submit a new request?
    //    Use a 'token' system where the youth are provided a token to
    //    access the results of their request
    res.status(400).json({ message: 'Your session has expired. Please submit a new request.' });
  }
  res.status(201).end();
};

/**
 * Closes a youth person's request (mongo document).
 * The requestId is removed from the service provider's collection of open requests.
 * @param {Object} req Express request object.
 * @param {Object} res Express response object.
 */
module.exports.closeRequest = (req, res) => {
  Request.findOneAndUpdate( // Update the request
    { _id: req.body.requestId },
    { $set: { closedAt: Date.now(), status: req.body.status } },
    { runValidators: true, new: true },
  ).exec()
    .then((request) => {
      // Remove request from service provider's open requests
      Service.findOneAndUpdate(
        { _id: request.service },
        { $pull: { openRequests: req.body.requestId } },
        { runValidators: true, new: true },
      );
    })
    .then(() => { res.status(201).end(); })
    .catch((err) => { errorHandler(res, err, 500); });
};
