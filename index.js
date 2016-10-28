/* Node App 
 * Functions below are organized by what "level" they deal with:
  General functions, and then functions that deal with sessions, prompts, and then ideas

  Connect with socket and mongoDB
 */

var express = require('express');
var expressApp = express();
//var socket = require(__dirname + '/socket.js');
var http = require('http').Server(expressApp);
var io = require('socket.io')(http);
var path = require('path');
var bodyParser = require('body-parser');
var util = require('util');

expressApp.use(bodyParser.json());
expressApp.use(bodyParser.urlencoded({
  extended: true
}));

expressApp.use(express.static(path.join(__dirname, '/public'))); //Add CSS
expressApp.use('/js', express.static(path.join(__dirname,'/js'))); //Add controller, data
expressApp.use('/lib', express.static(path.join(__dirname,'/lib'))); //Add Angular and socket

//Connect with socket.io between Angular App (controllers.js) and Express App (index.js)
io.on('connection', function(socket){
  socket.on('updateAll', function(ideaObject){
    io.emit('updateAll', ideaObject);
  });
  socket.on('updateLike', function(ideaID){
    io.emit('updateLike', ideaID);
  });
  socket.on('updateIdeas', function(ideaID){
    io.emit('updateIdeas', ideaID);
  });
  socket.on('updateSessions', function(ideaID){
  io.emit('updateSessions', ideaID);
  });
  socket.on('updatePrompts', function(ideaID){
  io.emit('updatePrompts', ideaID);
  });
  socket.on('APItest', function(ideaID){
  io.emit('APItest', ideaID);
  });
});

/*Connect with socket.io within Express App (index.js) 
//(Note Aug 10: Not successfully implemented, but a hopeful future step for real time updates in the browser when API functions are called
var serverIO = require('socket.io-client');
var serverSocket = serverIO();
serverSocket.on('connect', function () {
});*/

//Connect with mongoDB, set currentCollection and URL to local database
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var url = 'mongodb://localhost:27017/InterfaceDatabase';
var currentCollection = 'Geography';

//Set default currentSession to be "World Geography" document on start
var currentSession = "57a8a1ca7909460733f208b2";

//Load default HTML 
  expressApp.get('/', function(req, res){
    res.sendFile(__dirname + '/allSessions.html');
  });

  expressApp.get('/index', function(req, res){
    res.sendFile(__dirname + '/index.html');
  });

  expressApp.get('/addIdea', function(req, res){
    res.sendFile(__dirname + '/addIdeaPage.html');
  });


  //List information about current session
  expressApp.get('/list', function(req, res){
      MongoClient.connect(url, function(err, db) {
      //console.log("Attempting list");
      assert.equal(null, err);
      db.collection(currentCollection).find().toArray(function(err, result) {
        if (err){
          throw err;
        }
        for (var i = 0; i<result.length; i++){
          if (result[i]._id == currentSession){
            res.json(result[i]);
          }
        }
      });
     });
  });


//Functions for editing sessions
  //Archive relevant document by setting "visible" attribute to false
  expressApp.post('/removeSession', function(req, res){
      //Incoming entire session document
      MongoClient.connect(url, function(err, db) {
        assert.equal(null, err);
        var objectSession = ObjectId(req.body._id);
        //console.log(objectSession);
        db.collection(currentCollection).update({_id:objectSession},{$set:{"visible":false}})
        db.collection(currentCollection).find().toArray(function(err,result){
          if (err){
            throw err;
          }
          res.json(result);
          //res.json(result.slice(-1)[0]);
          //console.log(result);
        })
     });
  });

  //Restore relevant document by setting "visible" attribute to true
  expressApp.post('/restoreSession', function(req, res){
      //Incoming entire session document
      MongoClient.connect(url, function(err, db) {
        assert.equal(null, err);
        var objectSession = ObjectId(req.body._id);
        //console.log(objectSession);
        db.collection(currentCollection).update({_id:objectSession},{$set:{"visible":true}})
        db.collection(currentCollection).find().toArray(function(err,result){
          if (err){
            throw err;
          }
          res.json(result);
        })
     });
  });

  //Save incoming JSON object as document in database
  //If the incoming session title is unique, returns the newly created document
  //Error message if a session with this title already exists
  expressApp.post('/addNewSession', function(req, res){
      if (!('sessionID' in req.body)){
         MongoClient.connect(url, function(err, db) {
          console.log('adding sessionID');
          db.collection(currentCollection).find().toArray(function(err,result){
            var arrayLength = result.length;
            req.body['sessionID'] = arrayLength + 1;
          });
         });
      }
      if (!('title' in req.body)){
        res.json('Please include a session title.');
        return;
      }
      if (!('teacherName' in req.body)){
        res.json("Please include a teacher's name.");
        return;
      }
      if (!('date' in req.body)){
        res.json("Please include the date.");
        return;
      }
      if (!('visible' in req.body)){
        req.body['visible'] = true;
      }
      if (!('prompts' in req.body)){
        req.body['prompts'] = [];
      }
     
      MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      function safelyAddSession (addition){
        console.log('safely adding ');
        console.log(addition);
        db.collection(currentCollection).save(addition);
        db.collection(currentCollection).find().toArray(function(err,result){
          if (err){
            throw err;
          }
          res.json(result.slice(-1)[0]);
        });
      };

      //Check that the session is not already inserted
      db.collection(currentCollection).find().toArray(function(err,result){
        if (err){
          throw err;
        }
        var sessionsArray = result;
        //console.log('sessions array: ');
        //console.log(sessionsArray);
        for (var i = 0; i<sessionsArray.length; i++){
          if (sessionsArray[i].title == req.body.title){
            //console.log(sessionsArray[i].promptTitle);
            //console.log("This session already exists: " + req.body);
            var errorMessage = "!ERROR!";
            res.send(errorMessage);
            return;
          };
        }
        console.log('new session!');
        safelyAddSession(req.body);
      });
    })
  });

  //Returns all documents in collection
  expressApp.get('/getAllSessionData', function(req, res){
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      db.collection(currentCollection).find().toArray(function(err,result){
        if (err){
          throw err;
        }
        res.json(result);
      });
    });
  });

  //Set current session to use
  expressApp.post('/setSession', function(req, res){
    var sessionID = req.body._id;
    currentSession = sessionID;
    console.log("Now using session " + currentSession);
  });

  expressApp.get('/searchForSession/:id', function(req,res){
    console.log('received request to search for session');
    var input = req.params.id;
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      db.collection(currentCollection).find({"title":input}).toArray(function(err,result){
        if (err){
          throw err;
        }
        res.json(result);
      });
    });
  });

  //Request for sessionID by title
  expressApp.post('/getSessionID', function(req,res){
    console.log('getting session ID');
    console.log(req.body);
    var requestedSessionTitle = req.body.title;
    //console.log('body ' + req.body);
    console.log('getting sID of session ' + requestedSessionTitle);
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);

      //Result = all sessions with this prompt
      db.collection(currentCollection).find({"title": requestedSessionTitle}).toArray(function(err,result){
        if (err){
          throw err;
        }
        else{
          if (result.length == 0){
            console.log('no results!');
            var errorMessage = "!ERROR!";
            res.send(errorMessage);
            return;
          }
          //console.log("Total results : " + result.length);
          var resultSessionID = (result[0].sessionID);
          res.json(resultSessionID);
      }
      });
    });
  });

// Functions for editing prompts
  //Search for prompt by ID
  expressApp.get('/searchForPrompt/:id', function(req,res){
    console.log('received request to search for prompt');
    var input = req.params.id;
    var objectSession = ObjectId(input);
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      db.collection(currentCollection).find({_id:objectSession}).toArray(function(err,result){
        if (err){
          throw err;
        }
        res.json(result[0].prompts);
      });
    });
  });

  //Save incoming JSON object as prompt in document database
  expressApp.post('/addNewPrompt', function(req, res){
      //console.log(req.body);
      if (!('text' in req.body)){
        res.send('Please include a prompt.');
        return;
      };
      if (!('promptID' in req.body)){
        res.send('Please include a promptID.');
        return;
      };
      if (!('ideas' in req.body)){
        req.body['ideas'] = [];
        //console.log(req.body);
      };


      MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      var objectSession = ObjectId(currentSession);

      function safelyAddPrompt (addition){
        db.collection(currentCollection).update({_id:objectSession},{$push : {prompts:addition}});
        db.collection(currentCollection).find({_id:objectSession}).toArray(function(err,result){
          if (err){
            throw err;
          }
          res.json(result[0].prompts.slice(-1)[0]);
        })
      };

      //Check that the prompt is not already inserted
      db.collection(currentCollection).find({_id:objectSession}).toArray(function(err,result){
        if (err){
          throw err;
        }
        var promptsArray = result[0].prompts;
        for (var i = 0; i<promptsArray.length; i++){
          if (promptsArray[i].text == req.body.text){
            //console.log(promptsArray[i].text);
            //console.log("This prompt is already part of the session: " + req.body.text);
            var errorMessage = "!ERROR!";
            res.send(errorMessage);
            return;
          };
        }
        console.log('new prompt!');
        safelyAddPrompt(req.body);
      });

    });
    });

    expressApp.get('/updatePrompts', function(req, res){
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      var objectSession = ObjectId(currentSession);
      db.collection(currentCollection).find({_id:objectSession}).toArray(function(err,result){
        if (err){
          throw err;
        }
        res.json(result[0].prompts);
      });
    });
  });

  //Request for promptID by title and sessionID, receive promptID
  expressApp.post('/getPromptID', function(req,res){
    var requestedPrompt = req.body;
    console.log("requested prompt's sessionID : " + requestedPrompt.qSessionID);
    var numberSession = Number(requestedPrompt.qSessionID);
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);

      //Result = an array with the single queried session
      db.collection(currentCollection).find({"sessionID": numberSession}).toArray(function(err,result){
        if (err){
          throw err;
        }
        else{
          //console.log("Total results : " + result.length);
          //console.log(result);
          //console.log('attempting to return session ID');
          var promptsArray = result[0].prompts;
          for (var i = 0; i<promptsArray.length; i++){
            if (promptsArray[i].text == requestedPrompt.qText){
              res.json(promptsArray[i].promptID);
              return;
            }
          }
          var errorMessage = "!ERROR!";
          res.send(errorMessage);
          return;
        }
      });
    })
  });

//Functions for editing ideas 

  //Add new idea to database in relevant document, receive newly made idea
  expressApp.post('/addSafeIdea', function(req, res){
    //console.log('adding new idea');
      if (!('ID' in req.body)){
        //Add this dynamically somehow, find the value
        console.log('missing ID');
        return;
      }
      if (!('name' in req.body)){
        res.send("Please include the author's name.");
        return;
      }
      if (!('time' in req.body)){
        req.body['time'] = Date.now();
        console.log(req.body);
      }
      if (!('contentType' in req.body)){
        res.send("Please specify what type of content you'd like to share.");
        return;
      }
      if (!('content' in req.body)){
        res.send("Please include your idea's content.");
        return;
      }
      if(!('refrence' in req.body)){
        res.send("please include your refrence");
      }
      if (!('likes' in req.body)){
        req.body['likes'] = 0;
        console.log(req.body);
      }

      MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      
      var IDArray = String(req.body.ID).split('.');
      //console.log('ID Array: ' + IDArray);
      var mySessionID = IDArray[0];
      var promptID = IDArray[1]; 
      var promptIndex = promptID - 1;

      //console.log("PROMPT INDEX: " + promptIndex);

      //Necessary for being able to increment value of dynamic variable
      var variable = 'prompts.' + promptIndex + '.ideas';
      var trueVar = String(variable)
      var action = {};
      action[trueVar] = req.body;
      //console.log(action);
      db.collection(currentCollection).update({sessionID:Number(mySessionID)}, {$push : action});
    
      //Equivalent of this call, but promptIndex cannot be called in this format:
      //db.collection(currentCollection).update({_id:objectSession},{$push:{'prompts.promptIndex.ideas':req.body}});

      db.collection(currentCollection).find({sessionID:Number(mySessionID)}).toArray(function(err, result) {
        if (err){
          throw err;
        }
        //Result holds an array with the one relevant document
        res.json(result[0].prompts[promptIndex].ideas.slice(-1)[0]);
      })
     });
  });

  //Update ideas array based on prompt ID; return new ideas array
  expressApp.get('/updateIdeas/:id', function(req,res){
    var IDArray = req.params.id.split(".");
    var mySessionID = Number(IDArray[0]);
    var promptID = Number(IDArray[1]);
    console.log('promptID: ' + promptID);
    var promptIndex = Number(promptID - 1);
    console.log('promptIndex: ' + promptIndex);

    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      //Send back all ideas
      db.collection(currentCollection).find({sessionID:mySessionID}).toArray(function(err, result) {
        if (err){
          throw err;
        }
        //Result holds an array with the one relevant document
        //Send back the ideas array
        res.json(result[0].prompts[promptIndex].ideas);
      });
     });
  });

  //Function to like idea
  //Receives the ideaID of liked idea (string integer)
  //Returns idea's updated number of likes
  expressApp.get('/like/:id', function(req,res){
    var incoming = req.params.id;
    //console.log(incoming);
    
    var IDArray = String(incoming).split(".");
    var mySessionID = Number(IDArray[0]);
    var promptID = Number(IDArray[1]);
    var ideaID = Number(IDArray[2]);
    
    var promptIndex = promptID - 1;
    var ideaIndex = ideaID - 1;

    MongoClient.connect(url, function(err, db) {
      var objectSession = ObjectId(currentSession);
      assert.equal(null, err);
      
      //Necessary for being able to increment value of dynamic variable
      var action = {};
      var variable = 'prompts.' + promptIndex +'.ideas.' + String(ideaIndex) + '.likes';
      var trueVar = String(variable)
      action[trueVar] = 1;

      //console.log(action);

      db.collection(currentCollection).update({'sessionID':mySessionID}, {$inc : action});
      
      //Equivalent of this call, but idNumber cannot be called in this format:
      //db.collection(currentCollection).update({_id:objectSession},{$inc:{'prompts.promptIndex.ideas.ideaIndex.likes':1}});

      db.collection(currentCollection).find({'sessionID':mySessionID},{}).toArray(function(err,result){
        if (err) {
          throw err;
        }
          res.json(result[0].prompts[promptIndex].ideas[ideaIndex].likes);
        })
    })
  });
      

  //Update like value by returning the current number of likes stored in database
  expressApp.get('/updateLike/:id', function(req,res){
    var incoming = req.params.id;
    //console.log(incoming);
    var IDArray = String(incoming).split(".");
    var mySessionID = Number(IDArray[0]);
    var promptID = Number(IDArray[1]);
    var ideaID = Number(IDArray[2]);
   
    var promptIndex = promptID - 1;
    var ideaIndex = ideaID - 1;

    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      
      db.collection(currentCollection).find({'sessionID': mySessionID},{}).toArray(function(err,result){
        if (err) {
          throw err;
        }
          res.json(result[0].prompts[promptIndex].ideas[ideaIndex].likes);
          //res.json(result[0].ideas[idNumber-1].likes);
      })
     });
  });


/*
//An easy way to move many ideas into the database at once for developer's use only (testing)

expressApp.get('/moveIdeas', function(req,res){
  console.log('moving ideas');
  MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    var objectSession = ObjectId("578e3ed70e9540ef03359b6d");
    var newInput = {
      "promptID": 2,
      "text": "How do forces act on us?"
    }; 
       
    db.collection(currentCollection).find({_id:objectSession}).toArray(function(err, result) {
      if (err){
        throw err;
      }
      //Result holds an array with the one relevant document
      //Send back the ideas array
      var promptsArray = [ { "promptID" : 1.1, "text" : "Share a fact or an image about the world.", "ideas" : [ { "ID" : "1.1.1", "name" : "Chris", "time" : 1469199370000, "contentType" : "text", "content" : "Greenland is the largest island in the world.", "likes" : 17 }, { "ID" : "1.1.2", "name" : "Albus PercivalWulfricBrianDumbledore", "time" : 1469199370000, "contentType" : "text", "content" : "Vatican City is the smallest country in the world.", "likes" : 10 }, { "ID" : "1.1.3", "name" : "Ethan", "time" : 1467199370000, "contentType" : "image", "content" : "img/mountain.jpg", "likes" : 3 }, { "ID" : "1.1.4", "name" : "Ben", "time" : 1465199370000, "contentType" : "image", "content" : "img/grandcanyon.jpg", "likes" : 2 } ] }, { "promptID" : 1.2, "text" : "How do forces act on us?", "ideas" : [ { "ID" : "1.2.1", "name" : "Allen", "time" : 1469124849197, "contentType" : "text", "content" : "Friction is the force exerted by a surface as an object moves across it.", "likes" : 4 }, { "ID" : "1.2.2", "name" : "Anna", "time" : 1469124894977, "contentType" : "image", "content" : "http://cdn.funkidslive.com/wp-content/uploads/carforces-physics-245x170-custom.jpg", "likes" : 10 } ] } ];

        //SET TO PROMPTS!!
        //db.collection.currentCollection.save(newSession);
      //db.collection(currentCollection).update({_id:objectSession}, {$set:{'prompts':promptsArray}}); 
      //db.collection(currentCollection).update({_id:objectSession},{$inc:{'ideas.idNumber.likes':1}});
    });
   });

});*/


http.listen(3000, function(){
  console.log('listening on *:3000');
});













/***API Commands***

ADDING A NEW SESSION
Save incoming JSON object as document in database
Expecting JSON object:
  {
    "title": Session Title (String),
    "teacher": Teacher Name (String),
    "date": (String or Timestamp)
  }

If the provided title is not already stored in the database, then
Returns complete session:
  {
    sessionID: Means of identifying session (Interface-generated integer),
    title: User-inputted title (String),
    teacherName: User-inputted name (String),
    date: User-inputted date (String),
    visible: true (Boolean),
    prompts:[] (Empty array of prompts)
  }
*/
  expressApp.post('/APIaddNewSession', function(req, res){
    console.log("**\nReceived add new session request**");
    console.log(req.body);

      if (!('title' in req.body)){
        res.json('Please include a session title.');
        return;
      }
      if (!('teacherName' in req.body)){
        res.json("Please include a teacher's name.");
        return;
      }
      if (!('date' in req.body)){
        res.json("Please include the date.");
        return;
      }
      
      MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      function safelyAddSession (addition){
        console.log('safely adding new session');
        console.log(addition);
        db.collection(currentCollection).save(addition);
        db.collection(currentCollection).find().toArray(function(err,result){
          if (err){
            throw err;
          }
          res.json(result.slice(-1)[0]);
        });
        //serverSocket.emit('APItest');
      };

      //Check that the prompt is not already inserted
      
      db.collection(currentCollection).find().toArray(function(err,result){
        if (err){
          throw err;
        }
        var sessionsArray = result;
        //console.log('sessions array: ');
        //console.log(sessionsArray);
        for (var i = 0; i<sessionsArray.length; i++){
          if (sessionsArray[i].title == req.body.title){
            //console.log(sessionsArray[i].title);
            //console.log("This session already exists: " + req.body);
            var errorMessage = "!ERROR!";
            res.send(errorMessage);
            return;
          };
        }
        var officialSession = {};
        var arrayLength = result.length;
        officialSession['sessionID'] = arrayLength + 1;
        officialSession['title'] = req.body.title;
        officialSession['teacherName'] = req.body.teacherName;
        officialSession['date'] = req.body.date;
        officialSession['visible'] = true;
        officialSession['prompts'] = [];

        safelyAddSession(officialSession);
      });
    })
  });

/*serverSocket.on('APItest', function(){
  expressApp.get('/getAllSessionData');
});*/

/*
GETTING SESSION ID
Request for sessionID by title
Expecting JSON object:
  {
    "title": Session Title (String),
  }

If the provided title is a valid session title already stored in the database, then
Returns sessionID:
    sessionID: Means of identifying session (Interface-generated integer),
  
*/
  expressApp.post('/APIgetSessionID', function(req,res){
    console.log("\n**Received get session ID request**");
   
    var requestedSessionTitle = req.body.title;
    //console.log('body ' + req.body);
    console.log('getting sID of session ' + requestedSessionTitle);
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);

      //Result = all sessions with this prompt
      db.collection(currentCollection).find({"title": requestedSessionTitle}).toArray(function(err,result){
        if (err){
          throw err;
        }
        else{
          if (result.length == 0){
            console.log('no results!');
            var errorMessage = "!ERROR!";
            res.send(errorMessage);
            return;
          }
          //console.log("Total results : " + result.length);
          var resultSessionID = (result[0].sessionID);
          res.json(resultSessionID);
      }
      });
    });
  });


  /*ADDING A NEW PROMPT
  Save incoming JSON object as prompt in specified document in database
  Expecting JSON object:
    {
      "text": Prompt text (String),
      "sessionID": ID of session to add to (String or Number)
    }

  If the prompt title is not already stored in specified session, then
  Returns complete prompt:
    {
      promptID: Means of identifying prompt (Interface-generated string stored as SessionID.PromptID),
      text: User-inputted text (String),
      ideas:[] (Empty array of prompts)
    }
  */
  expressApp.post('/APIaddNewPrompt', function(req, res){
    console.log("\n**Received add new prompt request**");
    console.log(req.body);
      if (!('text' in req.body)){
        res.send('Please include a prompt.');
        return;
      };
      if (!('sessionID' in req.body)){
        res.send('Please include the sessionID.');
        return;
      };
      console.log(req.body);

      MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);

      var mySessionID = Number(req.body.sessionID);

      function safelyAddPrompt (addition){
        db.collection(currentCollection).update({sessionID:mySessionID},{$push : {prompts:addition}});
        db.collection(currentCollection).find({sessionID:mySessionID}).toArray(function(err,result){
          if (err){
            throw err;
          }
          res.json(result[0].prompts.slice(-1)[0]);
        })
      };

      //Check that the prompt is not already inserted
      db.collection(currentCollection).find({sessionID:mySessionID}).toArray(function(err,result){
        if (err){
          throw err;
        }
        var promptsArray = result[0].prompts;
        for (var i = 0; i<promptsArray.length; i++){
          if (promptsArray[i].text == req.body.text){
            //console.log('prompt already within');
            //console.log(promptsArray[i].text);
            console.log("This prompt is already part of the session: " + req.body.text);
            var errorMessage = "!ERROR!";
            res.send(errorMessage);
            return;
          };
        }

        var promptID = promptsArray.length + 1;
        var newPromptID = req.body.sessionID + "." + promptID;
        //req.body['promptID'] = newPromptID;
        var officialPrompt = {};
        officialPrompt['text'] = req.body.text;
        officialPrompt['promptID'] = newPromptID;
        officialPrompt['ideas'] = [];

        console.log('NOW saving new prompt!');
        console.log(officialPrompt);
        safelyAddPrompt(officialPrompt);
      });

    });
    });

  /*
  GETTING PROMPT ID
  //Request for promptID by text and sessionID, receive promptID
  Expecting JSON object:
    {
      "text": Prompt text (String),
      "sessionID": ID of session to add to (String or Number)
    }

  If the provided text is a valid prompt title already stored in the database, then
  Returns promptID:
      promptID: Means of identifying promptID (Interface-generated integer stored as SessionID.PromptID),
    
  */
  expressApp.post('/APIgetPromptID', function(req,res){
    console.log("\n**Received get prompt ID request**");
    var requestedPrompt = req.body;
    console.log("requested prompt's sessionID : " + requestedPrompt.sessionID);
    var numberSession = Number(requestedPrompt.sessionID);
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);

      //Result = an array with the single queried session
      db.collection(currentCollection).find({"sessionID": numberSession}).toArray(function(err,result){
        if (err){
          throw err;
        }
        else{
          console.log("Total results : " + result.length);
          
          //console.log('attempting to return session ID');
          var promptsArray = result[0].prompts;
          console.log(promptsArray);
          for (var i = 0; i<promptsArray.length; i++){
            if (promptsArray[i].text == requestedPrompt.text){
              console.log('sending back ' + promptsArray[i].promptID);
              res.json(promptsArray[i].promptID);
              return;
            }
          }
          console.log('not found');
          var errorMessage = "!ERROR!";
          res.send(errorMessage);
          return;
        }
      });
    })
  });

  /*ADDING A NEW IDEA
  Save incoming JSON object as idea in specified prompt in document in database
  Expecting JSON object:
    {
      "promptID": Prompt text (String),
      "name": Name of student (String),
      "contentType": "text" or "image" (String),
      "content": text, url, or dataURL (String)
    }

  Returns complete idea:
    {
      text: User-inputted text (String),
      ideas:[] (Empty array of prompts)

      "ID": Means of identifying idea (Interface-generated string stored as SessionID.PromptID.IdeaID),
      "name": User-inputted name (String),
      "time": Interface-generated time (Timestamp),
      "contentType": User-inputted contentType (String),
      "content": User-inputted content (String),
      "likes" 0 (Integer)
    }
  */
  expressApp.post('/APIaddNewIdea', function(req, res){
    console.log("**\nreceived add safe idea request**");

    //console.log('adding new idea');
      if (!('promptID' in req.body)){
        res.send("Please include the promptID.");
        return;
      }
      if (!('name' in req.body)){
        res.send("Please include the author's name.");
        return;
      }
      if (!('contentType' in req.body)){
        res.send("Please specify what type of content you'd like to share.");
        return;
      }
      if (!('content' in req.body)){
        res.send("Please include your idea's content.");
        return;
      }


      MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      
      var IDArray = String(req.body.promptID).split(".");
      var mySessionID = Number(IDArray[0]);
      var promptID = Number(IDArray[1]);
      var promptIndex = promptID - 1;

      function safelyAddIdea (addition){
        console.log("Safely adding: ");
        console.log(addition);
        //Necessary for being able to increment value of dynamic variable
        var variable = 'prompts.' + promptIndex + '.ideas';
        var trueVar = String(variable)
        var action = {};
        action[trueVar] = addition;
        //console.log(action);
        db.collection(currentCollection).update({sessionID: mySessionID}, {$push : action});
      };

        db.collection(currentCollection).find({sessionID: mySessionID}).toArray(function(err,result){
          if (err){
            throw err;
          }
          var ideaID = (result[0].prompts[promptIndex].ideas).length + 1;
          console.log('ideaID: ' + ideaID);
          officialIdea = {};
          officialIdea['ID'] = req.body.promptID + "." + ideaID;
          officialIdea['name'] = req.body.name;
          officialIdea['time'] = Date.now();
          officialIdea['contentType'] = req.body.contentType;
          officialIdea['content'] = req.body.content;
          officialIdea['refrence'] = req.body.refrence;
          officialIdea['likes'] = 0;

          //console.log(officialIdea);
          safelyAddIdea(officialIdea);
        })
      });

    MongoClient.connect(url, function(err, db) {
      var IDArray = String(req.body.promptID).split(".");
      var mySessionID = Number(IDArray[0]);
      var promptID = Number(IDArray[1]);
      var promptIndex = promptID - 1;

      assert.equal(null, err);
        db.collection(currentCollection).find({sessionID: mySessionID}).toArray(function(err,result){
          console.log('SENDING OFFICIAL RESULT');
          res.json(result[0].prompts[promptIndex].ideas.slice(-1)[0]);
        });
      });
  });

