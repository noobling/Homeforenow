const mongoose = require('mongoose');
const images = require('../middleware/images');

const Service = mongoose.model('Service');

/**
 * Renders the service page.
 * @param  {Object} req Express request object.
 * @param  {Object} res Express response object.
 */
module.exports.service = (req, res) => {
  res.render('service');
};

/**
 * Adds a new service (mongo document) to the database.
 * Redirects to the service provider's page.
 * @param {Object} req Express request object.
 * @param {Object} res Express response object.
 */
module.exports.addService = (req, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'You must be logged in to create a new service provider.' });
    return;
  }

  const service = new Service();

  service.name = req.body.name;
  service.phoneNumber = req.body.number;
  service.serviceType = req.body.serviceType;
  service.stayLength = req.body.stayLength;
  service.available = req.body.available;
  service.website = req.body.website;
  service.uri = req.body.uri;
  service.description = req.body.description;
  service.address = {
    suburb: req.body.suburb,
    postcode: req.body.postcode,
    state: req.body.state,
    coordinates: {
      coordinates: [req.body.long, req.body.lat],
    },
  };
  service.ageRange = {
    minAge: req.body.minAge,
    maxAge: req.body.maxAge,
  };

  service.save((err) => {
    if (err) {
      res.status(500).json({ message: err });
    } else {
      res.redirect('/location/'.concat(req.body.uri));
    }
  });
};

function countAvailableBeds(beds) {
  let count = 0;
  for (let i = 0; i < beds.length; i += 1) {
    if (!beds[i].isOccupied) count += 1;
  }
  return count;
}

/**
 * Renders a service provider's dashboard.
 * @param  {Object} req Express request object.
 * @param  {Object} res Express response object.
 */
module.exports.dashboard = (req, res) => {
  // console.log("hey");
  // if (!req.user || req.user.role !== 'service_provider') {
  //   res.status(401).json({ message: 'You are not authorised to view this page. Please log in with your service provider account.' });
  //   return;
  // }
  //
  // Service.findById(
  //   req.user.service[0],
  //   'name address.suburb beds tags openRequests'
  // ).exec()
  //   .then((service) => {
  //     res.render('serviceDashboard', {
  //       service: service,
  //       numAvailableBeds: countAvailableBeds(service.beds),
  //
  //     });
  //   })
  //   .catch((err) => { res.status(401).json({ message: err }); });

  res.render('serviceDashboard', {
    service: {
      name: 'Youngle Group',
      address: {
        suburb: 'Cannington',
      }
    },
    numAvailableBeds: 10
  });
};

/**
 * Used by deleteImageModal to delete an image stored in Firebase from a service
 * provider's profile.
 * @param  {Object} req Express request object.
 * @param  {Object} res Express response object.
 */
module.exports.deleteImage = (req, res) => {
  Service.findOne({ uri: req.params.serviceUri }, 'name img').exec().then((service) => {
    images.deleteImageFromService(service, req.params.serviceUri, req.params.index).then(() => {
      res.redirect('back');
    }).catch((err) => {
      res.status(500).json({ message: err });
    });
  }).catch((err) => {
    console.log('[ERROR]: Could not find image in mongoDB: '.concat(err));
    res.status(500).json({ message: err });
  });
};

module.exports.deleteLogo = (req, res) => {
  Service.findOne({ uri: req.params.serviceUri }, 'name logo').exec().then((service) => {
    images.deleteLogoFromService(service.logo, req.params.serviceUri).then(() => {
      res.redirect('back');
    }).catch((err) => {
      res.status(500).json({ message: err });
    });
  }).catch((err) => {
    console.log('[ERROR]: Could not find image in mongoDB: '.concat(err));
    res.status(500).json({ message: err });
  });
};

/**
 * Renders a service provider's profile page
 * @param  {Object} req Express request object.
 * @param  {Object} res Express response object.
 */
module.exports.profile = (req, res) => {
  Service.findOne({ uri: req.params.serviceUri }, 'name img logo').exec().then((service) => {
    Promise.all([
      images.getImagesForService(service, req.params.serviceUri),
      images.getLogoForService(service.logo, req.params.serviceUri),
    ]).then(([imgs, logo]) => {
      const params = imgs;
      params.logo = logo;
      res.render('editImages', params);
    }).catch((err) => {
      res.status(500).json({ message: err });
    });
  }).catch((err) => {
    res.status(500).json({ message: err });
  });
};
