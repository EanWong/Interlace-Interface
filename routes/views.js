var express = require('express');
var router = express.Router();

//Connect with mongoDB, set currentCollection and URL to local database
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var url = 'mongodb://localhost:27017/InterfaceDatabase';
var currentCollection = 'Geography2';


//Lists sessions
router.route('/sessions/:id')
  /* GET named contact and get contact info */
  .get(function(req, res) {
    var sessionID = req.params.id;
    res.render('index', {sessionID:sessionID});
  });

module.exports = router;