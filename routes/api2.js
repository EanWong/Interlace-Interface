var express = require('express');
var router = express.Router();

//Connect with mongoDB, set currentCollection and URL to local database
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var url = 'mongodb://localhost:27017/InterfaceDatabase';
var currentCollection = 'Geography2';


//Lists sessions
router.route('/sessions')
  /* GET named contact and get contact info */
  .get(function(req, res) {
     MongoClient.connect(url, function(err, db) {
        assert.equal(null, err);
        //Get collection for sessions
        var coll = db.collection(currentCollection)

        var query = {
                      "$project": {
                        "title":1,
                        "teacherName":1,
                        "date":1,
                        "visible":1,
                        "numPrompts": { "$size": "$prompts" } 
                      }
                    };
        coll.aggregate([query]).toArray(function(err, sessions) {
          
          assert.equal(null, err);
          res.json(sessions);

          db.close();

        });

     }); 

  })
  .post(function(req,res) {
    console.log("**\nReceived add new session request**");

    check_session_data(req.body, function(err, session_data) {
      if (err) {
        res.json(err);
      } else {
        add_session(session_data, function(err, session) {
          if (err) {
            res.json(err);
          } else {
            res.json(session);
          }
        });
      }
    });
  });

//Should it return an array? Currently doesn't. Does it have an updated session in the body? YES
router.route('/sessions/:sessionID')
  .get(function(req, res) {
     MongoClient.connect(url, function(err, db) {
        assert.equal(null, err);

        //Get collection for sessions
        var coll = db.collection(currentCollection)

        var sessionID = ObjectId(req.params.sessionID);

        var match = {"_id":sessionID};
        var proj = {
                      "_id":1,
                      "title":1,
                      "teacherName":1,
                      "date":1,
                      "prompts.text":1
                    };
                
        coll.aggregate( [
                          {"$match": match},
                          {"$project": proj}
                        ]
                      ).toArray(function(err, session) {
          
                        assert.equal(null, err);
                        res.json(session);

                        db.close();

            });
      });
  })
  .post(function(req, res) {

    console.log(req.body);
    var sessionID = ObjectId(req.params.sessionID);  //TODO clean
    var edits = req.body.edits;    //TODO clean
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);

      db.collection(currentCollection).findAndModify(
        {'_id': sessionID},
        [['_id','asc']],
        {$set: edits},
        {new: true},
        function(err, object) {
          if (err){
              console.warn(err.message);  // returns error if no matching object found
          }else{
              console.log(object);
              var numPrompts = object.value.prompts.length;
              console.log(numPrompts);
              object.value.numPrompts = numPrompts;
              delete object.value.prompts;
              res.json(object.value);
          }
        });


      //db.collection(currentCollection).update({_id:sessionID},{$set:edits})

    });
    
  });

//List prompt info (num ideas for each prompt, prompt text, ID, etc)
router.route('/sessions/:sessionID/prompts')
  .get(function(req, res) {
     MongoClient.connect(url, function(err, db) {
        assert.equal(null, err);

        //Get collection for sessions
        var coll = db.collection(currentCollection)

        var sessionID = ObjectId(req.params.sessionID);
        var match = {"_id":sessionID};
        var proj = {"prompts":1};
        var unwind = "$prompts";
        var proj2 = {"text":"$prompts.text","numIdeas":{"$size":"$prompts.ideas"}};
                
        coll.aggregate( [
                          {"$match": match},
                          {"$project": proj},
                          {"$unwind": unwind},
                          {"$project": proj2}
                        ]
                      ).toArray(function(err, prompts) {
          
                        assert.equal(null, err);

                        res.json(prompts);

                        db.close();

            });


      });
  })
  .post(function(req, res) {
    //Adds a prompt(s?)
    req.body.sessionID = req.params.sessionID;
    check_prompt_data(req.body, function(err, prompt_data) {
      if (err) {
        res.json(err);
      } else {
        add_prompt(prompt_data, function(err, promptID) {
          res.json({"promptID":promptID});
        })
      }


    });

  });

router.route('/sessions/:sessionID/prompts/:promptIndex')
  .get(function(req, res) {
     MongoClient.connect(url, function(err, db) {
        assert.equal(null, err);

        //Get collection for sessions
        var coll = db.collection(currentCollection)

        //Not strings this time
        var sessionID = ObjectId(req.params.sessionID);
        var prompt_index = parseInt(req.params.promptIndex);

        var match = {"_id": sessionID};
        var project =  {prompt: {$arrayElemAt: ["$prompts",prompt_index]}}
        //var project2 = {"text":"$prompt.text","ideas":"$prompt.ideas"};
               
        coll.aggregate( [
          {"$match": match},
          {"$project": project}
          //{"$project": project2}
        ]
      	).toArray(function(err, prompt) {

	        if (err) {
	        	res.json(err);
	        } else {
	        	res.json(prompt);
	        }
	        db.close();

     	 });
    });

  });

router.route('/sessions/:sessionID/prompts/:promptIndex/ideas')
  .get(function(req, res) {
     MongoClient.connect(url, function(err, db) {
        assert.equal(null, err);

        //Get collection for sessions
        var coll = db.collection(currentCollection)

        //Not strings this time
        var sessionID = ObjectId(req.params.sessionID);
        var prompt_index = parseInt(req.params.promptIndex);

        var match = {"_id": sessionID};
        var project =  {prompt: {$arrayElemAt: ["$prompts",prompt_index]}}
        var project2 = {"ideas":"$prompt.ideas"};
               
        coll.aggregate( [
          {"$match": match},
          {"$project": project},
          {"$project": project2}
        ]
        ).toArray(function(err, ideas) {

          if (err) {
            res.json(err);
          } else {
            res.json(ideas);
          }
          db.close();

       });
    });

  })
  .post(function(req, res) {
      req.body.sessionID = req.params.sessionID;
      req.body.promptIndex = req.params.promptIndex;
      check_idea_data(req.body, function(err, idea_data) {
        console.log(idea_data);
        if (err) {
          res.json(err);
        } else {
           add_idea(idea_data, function(err, ideaIndex) {
            if (err) {
              res.json(err);
            } else {
              res.json({"ideaIndex":ideaIndex});
            }
          });
        }


      });


  });

router.route('/sessions/:sessionID/prompts/:promptIndex/ideas/:ideaIndex')
  .get(function(req, res) {
    MongoClient.connect(url, function(err, db) {
        assert.equal(null, err);

        //Get collection for sessions
        var coll = db.collection(currentCollection)

        //Not strings this time
        var sessionID = ObjectId(req.params.sessionID);
        var prompt_index = parseInt(req.params.promptIndex);
        var idea_index = parseInt(req.params.ideaIndex);

        var match = {"_id": sessionID};
        var project =  {prompt: {$arrayElemAt: ["$prompts",prompt_index]}}
        var project2 = {"idea":{$arrayElemAt:["$prompt.ideas", idea_index]}};
        var project3 = {"name": "$ideas.name", 
                        "contentType": "$ideas.contentType", 
                        "content": "$ideas.content", 
                        "time": "$ideas.time", 
                        "reference":"$ideas.reference", 
                        "likes": "$ideas.likes"
                      };   

        console.log(prompt_index);
        coll.aggregate( [
          {"$match": match},
          {"$project": project},
          {"$project": project2}
         // {"$project": project3}
        ]
        ).toArray(function(err, prompt) {

          if (err) {
            res.json(err);
          } else {
            res.json(prompt);
          }
          db.close();

       });
    });

  });

function check_session_data(data, cb) {
  var err = null;

  if (!('title' in data)){
    err = 'Please include a session title.';
  }
  if (!('teacherName' in data)){
    err = "Please include a teacher's name.";
  }
  if (!('date' in data)){
    err = "Please include the date.";
  }
  cb(err, data);
}

//Session data format includes title, teachername and date
//Must be setup with correct data

function add_session(session_data, cb) {
  MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);

    var coll = db.collection(currentCollection);

    var official_session = {};
    official_session['title'] = session_data.title;
    official_session['teacherName'] = session_data.teacherName;
    official_session['date'] = session_data.date;
    official_session['visible'] = true;
    official_session['prompts'] = [];

    coll.insert(official_session, function(err, records) {
    	assert.equal(null, err);
      console.log(records);
    	var session = records.ops[0];
    	db.close();
    	cb(err, session);
    });

  });
}

//Takes in a single prompt right now, should it take in multiple?
function check_prompt_data(data, cb) {

  var prompt_data = {};
  var err = null;
    if (!('sessionID' in data)) {
      err.push('Please include the sessionID.')
    }
    prompt_data.sessionID = data.sessionID;
    if (!('text' in data)){
      err.push('Please include a prompt.');
    };    
    prompt_data.text = data.text;
    cb(err, prompt_data);
}

function add_prompt(prompt_data, cb) {
    MongoClient.connect(url, function(err, db) {
	    assert.equal(null, err);

	    var coll = db.collection(currentCollection);

	    var prompt = {
	    	"text": prompt_data.text,
	    	"ideas": []
	    }
	    var sessionID = ObjectId(prompt_data.sessionID);
	    
	    var query = {"_id":sessionID};
	    var update = {"$push":{"prompts":prompt}};
	    var options = {"new":true};

		coll.findAndModify( 
			query,
			[['_id', 'asc']],
		    update,
		    options,
		    function(err, result) {
		      assert.equal(null, err);
		      console.log(result);
		      var promptIndex = result.value.prompts.length - 1;
          db.close();
		      cb(err, promptIndex);
		    });
  	});
}

function check_idea_data(data, cb) {
  var idea_data = {};
  var err = [];
  console.log("Checking idea data");
  console.log(data);
  if (!('sessionID' in data)){
    err.push("Please include the sessionID.");
  }
  idea_data.sessionID = data.sessionID;
  if (!('promptIndex' in data)){
    err.push("Please include the promptIndex.");
  }
  idea_data.promptIndex = parseInt(data.promptIndex);
  if (!('name' in data)){
    err.push("Please include the author's name.");
  }
  idea_data.name = data.name;
  if (!('contentType' in data)){
    err.push("Please specify what type of content you'd like to share.");
  }
  idea_data.contentType = data.contentType;
  if (!('content' in data)){
    err.push("Please include your idea's content.");
  }
  idea_data.content = data.content;

  if (err.length == 0) {
    err = null;
  }
  cb(err, idea_data);  
}

function add_idea(idea_data, cb) {
  MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    var coll = db.collection(currentCollection);
    
    var sessionID = ObjectId(idea_data.sessionID);
    var promptIndex = idea_data.promptIndex;
    console.log("promptIndex:" + idea_data.promptIndex);
    
    //Setup new idea
    var idea = {};
    idea.name = idea_data.name;
    idea.contentType = idea_data.contentType;
    idea.content = idea_data.content;
    idea.time = Date.now();
    idea['reference'] = [];//hard coded
    idea['likes'] = 0; // hard coded
    console.log(idea);
	    
    var query = {"_id":sessionID};
    var place_to_add_idea = "prompts." + promptIndex + '.ideas';
    console.log(place_to_add_idea);
    //var update = {"$push":{place_to_add_idea:idea}};
    var update = {};
    var update_field = {};
    update_field[place_to_add_idea] = idea;
    update["$push"] = update_field;
    console.log(update);
    var options = {"new":true};


  	coll.findAndModify( 
  		query,
      [['_id', 'asc']],
  	  update,
  	  options,
  	    function(err, result) {
  	      assert.equal(null, err);
  	      console.log(result);
  	      var ideaIndex = result.value.prompts[promptIndex].ideas.length - 1;
          db.close()
  	      cb(err, ideaIndex);
  	});

  });  
}

module.exports = router;