/* Angular App 
 * Holds all scope variables and functions for Angular/client-side

 * Engaging between Angular and the Node app often happens by sending http
 * requests to the node app, then having node send back relevant data. 

 * Scope Variables *
 	**USED WITHIN CONTROLLERS.JS**
	$scope.allData 			JSON of current document/session
	$scope.allSessions 		ARRAY of all documents in collection
	$scope.visibleSessions 	ARRAY of all documents in collection with attribute visible set to "true"
	
	$scope.currentPrompt	INT promptID of current prompt
	$scope.currentSession	JSON of current session

	**USED WITHIN HTML**
 	Some scope variables are purely for maintaining what HTML content is displayed
 	ex. In allSessions.html, decide whether or not to show session message, and then what message to show
	 	$scope.showAddNewSession = false;
		$scope.showErrorAddNewSession = false;
		$scope.addNewSessionResponse = "Your session has been submitted.";

 * Functions below are organized by what "level" they deal with:
 	General functions, and then functions that deal with sessions, prompts, and then ideas

 */

var angularApp = angular.module("myApp", ['ngRoute']);



console.log("starting angular app");

//Angular controller with scope variables defined
angularApp.controller("InterfaceController", 
	['$scope','$http', 'socket', '$route', '$routeParams', '$location', '$window',
	function($scope,$http, socket, $route, $routeParams, $location, $window)
{    

	/* 1/25/2017 Ean's addition to handle when a session is provided by the server */

	$scope.currentSessionID = $('input#sessionID').val();
	if ($scope.currentSessionID == null) {
		
		console.log("No session defined");

		//Get all mongoDB documents' information
		$http.get('/api2/sessions').then(function(response){

			$scope.allSessions = response.data;

			var visibleSessionsArray = [];
			for (var i = 0; i<response.data.length; i++){
				if (response.data[i].visible){
					visibleSessionsArray.push(response.data[i]);
				}
			} 
			$scope.visibleSessions = visibleSessionsArray;
		});


	} else {

		console.log("Session defined");

	    //Get current session information
		$http.get('/api2/sessions/' + $scope.currentSessionID).then(function(response){
			$scope.allData = {prompts: response.data[0].prompts};
			$scope.allData["title"] = response.data[0].title;
			//$scope.allData = {prompts:response.data};
		});


	}

	/* end of ean's addition */

	//Setting scope variables, general set-up

	$scope.$route = $route;
	$scope.$location = $location;
    $scope.$routeParams = $routeParams;

	console.log("Starting controller");
	$scope.arrayRefrences = [];
	$scope.newIdeaRefrence = "";
	//$scope.IdeaRefrence="";
	
	$scope.logId = function(ideaaaa) {
		$scope.id=ideaaaa;
        console.log($scope.id);
    }

//Functions for editing sessions
	//Archive relevant document by setting "visible" attribute to false
	$scope.archiveSession = function(inputtedSession){

		var sessionID = inputtedSession._id;
		var body = {};
		body["edits"] = {"visible" : false}

		$http.post('/api2/sessions/' + sessionID, body).then(function(response){
			console.log("response of archiving a session");
			console.log(response.data);

			var updated_session = response.data;

			//($scope.allSessions) = (response.data);

			//Update all clients
			socket.emit('updateSessions', updated_session);
		});
	};

	//Restore relevant document by setting "visible" attribute to true
	$scope.restoreSession = function(inputtedSession){
		var sessionID = inputtedSession._id;
		var body = {};
		body["edits"] = {"visible" : true}

		$http.post('/api2/sessions/' + sessionID, body).then(function(response){
			console.log("response of archiving a session");
			console.log(response.data);

			var updated_session = response.data;
			//($scope.allSessions) = (response.data);

			//Update all clients
			socket.emit('updateSessions', updated_session);
		});
	};

	//Get input from form and create new JSON object for session
	//Post JSON object to insert it as a document into database
	//Append JSON object to allSessions array and call socket emit to update in real time
	$scope.addSession = function(inputtedSession){
		$scope.showAddNewSession = false;
		$scope.showErrorAddNewSession = false;
		var newSession = angular.copy(inputtedSession);

		//Be sure that all forms in the field are filled
		if (!(newSession.hasOwnProperty('title')) || newSession.title == ""){
			$scope.showAddNewSession = true;
			$scope.addNewSessionResponse = "Please include a session title."
			return;
		}

		if (!(newSession.hasOwnProperty('teacherName')) || newSession.teacherName == ""){
			$scope.showAddNewSession = true;
			$scope.addNewSessionResponse = "Please include the teacher's name."
			return;
		}

		if (!(newSession.hasOwnProperty('date')) || newSession.date == ""){
			$scope.showAddNewSession = true;
			$scope.addNewSessionResponse = "Please include the date."
			return;
		}
		
		//Create full session (with all attributes) to be input in database
		var fullNewSession = {
			//"sessionID":$scope.allSessions.length + 1,
			"title":newSession.title,
			"teacherName":newSession.teacherName,
			"date":newSession.date,
			//"prompts":[],
			//"visible":true
		};
		console.log('add session!');

		//Post full session to node app, which will connect with mongoDB
		$http.post('/api2/sessions',fullNewSession).then(function(response){
			//If this session already exists within the database, the node app will send back
			//the error message '!ERROR!'.  As of now, it is crucial to have unique session titles
			//because the program gets sessionIDs by searching by session title
			if (response.data == "!ERROR!"){
				$scope.showAddNewSession = false;
				$scope.showErrorAddNewSession = true;
				$scope.errorAddNewSessionResponse = "This session title already exists.  Please add a unique session title.";
			}
			else{
				$("#newSession_frm")[0].reset();
				//Receiving new session and pushing to sessions array
				//($scope.allSessions).push(response.data);
				var newSession = response.data;
				//Update all clients
				socket.emit('updateSessions', newSession);

				$scope.showAddNewSession = true;
				$scope.showErrorAddNewSession = false;
				$scope.addNewSessionResponse = "Your session has been submitted.";
			}
		});

	};
	//socket.emit and socket.on must be declared in separate functions
	socket.on('updateSessions', function(updatedSession){
		$scope.updateScopeSessions(updatedSession);
		/*$http.get('/getAllSessionData/').then(function(response){
			//console.log(response.data);
			$scope.allSessions = response.data;
		});*/
	});

	$scope.updateScopeSessions = function(updatedSession) {

		var sessionID = updatedSession._id;

		var addSession = true;
		for (var i = 0; i < this.allSessions.length; i++) {
			if (sessionID == this.allSessions[i]._id) {
				console.log("Trying to update session");
				addSession = false;
				Object.assign(this.allSessions[i], updatedSession);
			} 
			//has checked every session id for a match, and has not found a match
			if (i == this.allSessions.length - 1 && addSession == true) {
				console.log("Trying to add new session");
				this.allSessions.push(updatedSession);
			}
		} 

		if (this.allSessions.length == 0) {
			console.log("Trying to add new session");
			this.allSessions.push(updatedSession);
		}

		console.log(this.allSessions);

	}

	//Set current session, 1/24/17 will eventually need to be changed to allow better for cookies
	$scope.useSession = function(inputtedSession){
		//this.currentSession = inputtedSession._id;
		console.log("useSession enabled");
		console.log(inputtedSession);
		console.log($window.location.replace('/views/sessions/' + inputtedSession._id));
		//location('/views/sessions/' + inputtedSession._id);

		/*$http.post('/setSession', inputtedSession).then(function(response){
		});*/
		
	};

	//Search for session by title
	$scope.searchForSession = function(input){
		console.log('input :' + input);
		$http.get('/searchForSession/'+input).then(function(response){
			$scope.sessionResults = (response.data);
		});
	};

	//Add prompt to selected session
	$scope.addToFoundSession = function(input){
		var newInput = input._id;
		//console.log(typeof(newInput));
		$scope.currentSession = input;
		//console.log("currentSession***")
		//console.log($scope.currentSession);
		$http.post('/setSession',input).then(function(response){
		});
		$http.get('/searchForPrompt/'+newInput).then(function(response){
			$scope.promptResults = (response.data);
		});
	};

	//Get input from form and search for session by title
	//If no session with this title can be found, display error message
	//Otherwise, show the found session's ID
	$scope.getSessionID = function(query){
		$scope.showErrorGetSessionIDSession = false;
		$scope.showGetSessionIDResponse = false;
		//var qSessionTitle = angular.copy(query);
		console.log(query);
		if ((query.title == "") || typeof(query)=="undefined"){
			$scope.showErrorGetSessionIDSession = true;
			$scope.errorGetSessionIDResponse = "Please insert a session title to search for."
			$scope.showGetSessionIDResponse = false;
			return;
		}
		console.log('getting session ID of ' + query.title);
		$http.post('/getSessionID/', query).then(function(response){
			if (response.data == "!ERROR!"){
				//console.log('was  already in');
				$scope.showErrorGetSessionIDSession = true;
				$scope.showGetSessionIDResponse = false;
				$scope.errorGetSessionIDResponse = "This session could not be found.  Please try searching again."
			}
			else{
				$("#getSession_frm")[0].reset();
				$scope.getSessionIDResponse = response.data;
				$scope.showGetSessionIDResponse = true;
				$scope.showErrorGetSessionIDSession = false;
			}
		});
	};

//Functions for editing prompts

	//Get input from form and create new JSON object for prompt
	//Post JSON object to insert it as a prompt in relevant document
	//If prompt is not already listed within this document, append new prompt to allData.prompts array
	//Call socket emit to update in real time
	$scope.addPrompt = function(inputtedPrompt){
		console.log("Adding prompt:");
		console.log(inputtedPrompt);

		console.log($scope);

		$scope.showErrorAddNewPrompt = false;
		if ((inputtedPrompt == "") || typeof(inputtedPrompt)=="undefined"){
			$scope.showErrorAddNewPrompt = true;
			$scope.errorAddNewPromptResponse = "Please insert a prompt title to add."
			return;
		}

		$("#newPrompt_frm")[0].reset();

		// Create prompt
		//Create full session (with all attributes) to be inputted in database
		var fullNewPrompt = {
			"text":inputtedPrompt,
		};

		var sessionID = $scope.currentSessionID;

		$http.post('/api2/sessions/' + sessionID + '/prompts', fullNewPrompt).then(function(response) {
			
			//Error handling?
			var promptID = response.data.promptID;
			var prompt = response.data.prompt;

			console.log(prompt);
			//Update all clients
			socket.emit('updatePrompts', promptID);
		});	

/*		var currentSessionID = $scope.allData.sessionID;
		var currentPromptNumber = $scope.allData.prompts.length + 1;
		var fullNewPrompt = {
			"promptID": currentSessionID + "." + currentPromptNumber,
			"text":inputtedPrompt,
			"ideas":[],
		};
*/
/*
		$http.post('/addNewPrompt',fullNewPrompt).then(function(response){
			if (response.data == "!ERROR!"){
				$scope.showErrorAddNewPrompt = true;
				$scope.errorAddNewPromptResponse = "This prompt is already part of the session.  Please add a unique prompt."
			}
			else{
				$scope.showErrorAddNewPrompt = false;
				($scope.allData.prompts).push(response.data);
			//console.log($scope.allData.prompts);

			//Update all clients
			socket.emit('updatePrompts');
		}
		});
*/
	};
	//socket.emit and socket.on must be declared in separate functions
	socket.on('updatePrompts', function(promptIndex){
		$http.get('/api2/sessions/' + $scope.currentSessionID + '/prompts/' + promptIndex).then(function(response){
			console.log(response);
			console.log($scope.allData.prompts);
			console.log(promptIndex);
			$scope.allData.prompts.splice(promptIndex,0,response.data[0].prompt);
			//$scope.allData.prompts[promptIndex] = response.data[0].prompt;
		})
	});


	//Get input from form and search for prompt text within a session
	//If no prompt within this session can be found, display error message
	//Otherwise, show the found prompt's ID
	$scope.getPromptID = function(query){
		$scope.showGetPromptIDResponse = false;
		$scope.showErrorGetPromptIDResponse = false;
		if (typeof(query) == "undefined"){
			console.log('undefined query');
			$scope.showErrorGetPromptIDResponse = true;
			$scope.errorGetPromptIDResponse = "Please include content to search for."
			return;
		}
		if (!(query.hasOwnProperty('qText')) || query.qText == ""){
			console.log('no qtext');
			$scope.showErrorGetPromptIDResponse = true;
			$scope.errorGetPromptIDResponse = "Please include prompt text to search for."
			return;
		}
		if (!(query.hasOwnProperty('qSessionID')) || query.qSessionID == ""){
			console.log('no qsessionID');
			$scope.showErrorGetPromptIDResponse = true;
			$scope.errorGetPromptIDResponse = "Please include a session ID to search for."
			return;
		}
		var qPrompt = angular.copy(query);

		$http.post('/getPromptID', qPrompt).then(function(response){
			if (response.data == "!ERROR!"){
				$scope.showErrorGetPromptIDResponse = true;
				$scope.showGetPromptIDResponse = false;
				$scope.errorGetPromptIDResponse = "This prompt could not be found.  Please try again."
			}
			else{
				$("#getPrompt_frm")[0].reset();
				$scope.getPromptIDResponse = response.data;
				$scope.showGetPromptIDResponse = true;
				$scope.showErrorGetPromptIDResponse = false;
			}	
		});
	};

	//Add idea to selected prompt
	$scope.addToFoundPrompt = function(destinationPromptID){
		$scope.currentPrompt = destinationPromptID;
		console.log("Setting currentPrompt to " + destinationPromptID);
		$scope.readyToAddIdea = true;
	};

//Functions for editing ideas
	//Get input from form and create new JSON object for idea
	//Post JSON object to insert it as a idea to specified prompt in relevant document
	//Call socket emit to update in real time
	$scope.addRemoteIdea = function(InputtedIdea){
		var newIdea = angular.copy(InputtedIdea);
		console.log("!!New Idea!!")
		console.log(newIdea);

		if (!(newIdea.hasOwnProperty('name')) || newIdea.name == ""){
			$scope.showAddRemoteIdea = true;
			$scope.addRemoteIdeaResponse = "Please include the author's name."
			return;
		}

		if (!(newIdea.hasOwnProperty('contentType')) || newIdea.contentType == ""){
			$scope.showAddRemoteIdea = true;
			$scope.addRemoteIdeaResponse = "Please include the idea's content type."
			return;
		}

		if (!(newIdea.hasOwnProperty('content')) || newIdea.content == ""){
			$scope.showAddRemoteIdea = true;
			$scope.addRemoteIdeaResponse = "Please include idea content."
			return;
		}
		$("#newRemoteIdea_frm")[0].reset();
		
		console.log("$scope.currentPrompt " + $scope.currentPrompt);

		var IDArray = String($scope.currentPrompt).split('.');
		//console.log('ID Array: ' + IDArray);
		var promptID = IDArray[1];
		var cPrompt = $scope.allData.prompts[promptID - 1];
		console.log("*CURRENT PROMPT*");
		console.log(cPrompt);

		//var cPrompt = $scope.allData.prompts[$scope.currentPrompt - 1];

		var ideaID = cPrompt.ideas.length + 1;
		var fullNewIdea = {
			"ID": $scope.currentPrompt + "." + ideaID,
			"name": newIdea.name,
			"time": Date.now(),
			"contentType": newIdea.contentType,
			"content": newIdea.content,
			"likes":0,
		};
		console.log("*FULL NEW IDEA*");
		console.log(fullNewIdea);

		$http.post('/addSafeIdea', fullNewIdea).then(function(response){
			//Receiving new idea and pushing to ideas array of current prompt
			console.log("RESPONSE TO BE ADDED");
			console.log(response.data);
			cPrompt.ideas.push(response.data);

			console.log("*CURRENT CPROMPT ARRAY*");
			console.log(cPrompt.ideas);
			//Update all clients
			socket.emit('updateIdeas', cPrompt.promptID);

			$scope.showAddRemoteIdea = true;
			$scope.addRemoteIdeaResponse = "Your idea has been submitted."
		});
	};
	//socket.emit and socket.on must be declared in separate functions
	socket.on('updateIdeas', function(promptIndex){
		console.log('updating ideas on prompt ' + incomingPrompt);
/*			$http.get('/updateIdeas/'+incomingPrompt).then(function(response){
				console.log('receiving ' + response.data);
				//console.log('**');
				//console.log($scope.allData.prompts[incomingPrompt-1]);
				var IDArray = String(incomingPrompt).split('.');
				var promptID = IDArray[1];

				($scope.allData.prompts[promptID-1].ideas) = response.data;
				//($scope.allData.ideas) = response.data;
			})
*/	});

	//Get input from form and create new JSON object for idea
	//Post JSON object to append to the "ideas" array in the relevant document
	//Append JSON object to allSessions's ideas array and call socket emit to update in real time
	


	$scope.showRefrence = function(idea)
	{
		var testIdea = angular.copy(idea);
		var myPromt = testIdea.ID.split('.');
		var myCurrentPromt = myPromt[1];
		var cPrompt = $scope.allData.prompts[myCurrentPromt - 1];

		//console.log (cPrompt.ideas.length);
		//var temperory= testIdea.refrence.replace("[",",");
		//var temp= temperory.replace("]",",");
		
		var refrenceArray = testIdea.refrence.split(/[\s,\[\]]+/);
		//console.log(refrenceArray);

		
		for (var i =0; i< refrenceArray.length-1 ; i=i+2) {
			for (var j = 0; j< cPrompt.ideas.length ; j++) {
				if(cPrompt.ideas[j].name==refrenceArray[i] && cPrompt.ideas[j].index == refrenceArray[i+1])
					cPrompt.ideas[j].refrenced=1;
				
			};
		};

	};





	$scope.resetRefrence = function(idea)
	{
		var testIdea = angular.copy(idea);
		var myPromt = testIdea.ID.split('.');
		var myCurrentPromt = myPromt[1];
		var cPrompt = $scope.allData.prompts[myCurrentPromt - 1];
		
		
		for (var i = cPrompt.ideas.length - 1; i >= 0; i--) {
			
				cPrompt.ideas[i].refrenced=0;
			
		}
	};

	// sending refrences from idea panel to NewIdea panel
	$scope.sendRefrence = function(promptIndex, ideaIndex){
		console.log($scope.arrayRefrences);
		console.log($scope.newIdeaRefrence);
		//console.log(idea);
		//var testIdea = angular.copy(idea);

		//Ean's addition
		//Create reference
		var sessionID = $scope.currentSessionID;
		var reference = {"sessionID": sessionID, "promptIndex":promptIndex, "ideaIndex":ideaIndex};

		//Logic for adding reference to reference pool | Ensures uniqueness
		var referenceExists = false;
		for (var i = 0; i < this.arrayRefrences.length; i++) {
			var currPromptIndex = this.arrayRefrences[i].promptIndex;
			var currIdeaIndex = this.arrayRefrences[i].ideaIndex;
			var currSessionID = this.arrayRefrences[i].sessionID;

			if (reference.sessionID == currSessionID && reference.promptIndex == currPromptIndex && reference.ideaIndex == currIdeaIndex) {
				referenceExists = true;
			}
		}

		if (!referenceExists) {
			console.log("Adding new reference to pool")
			this.arrayRefrences.push(reference);
		} else {
			console.log("Already exists");
		}


		console.log(this.arrayRefrences);
		//End of Ean's addition



		//console.log(testIdea.ID);
		var authorNumber = 0;
		/*var myPromt = testIdea.ID.split('.');
		var myCurrentPromt = myPromt[1];
		var cPromt = $scope.allData.prompts[myCurrentPromt-1];


		var refrenceArray = $scope.newIdeaRefrence.split(/[\s,\[\]]+/);
		


		var count=0;
		//checking for refrences and see if they alredy exist
		for (var i = 0; i <refrenceArray.length-1; i=i+2) {
			if(refrenceArray[i]==testIdea.name && refrenceArray[i+1]==testIdea.index)
				count++;

		}
		if (count==0){
			if ($scope.newIdeaRefrence == ""){
					$scope.newIdeaRefrence =testIdea.name + "["+testIdea.index+"]" ;
		 		}
		 	else 
		 		$scope.newIdeaRefrence = $scope.newIdeaRefrence +","+ testIdea.name + "["+testIdea.index+"]";
		 	

			
		}
		console.log($scope.newIdeaRefrence);
		
		*/
		 
		
	};

	//editing input text for refrences
	$scope.editRefrence = function(newrefrence){
		$scope.newIdeaRefrence=newrefrence;
		
		console.log("change");
		//var test= $scope.newIdeaRefrence;
		console.log($scope.newIdeaRefrence);
		//console.log($scope.newIdeaRefrence);
		


		
	};
	

	$scope.addIdea = function(InputtedIdea){
		var newIdea = angular.copy(InputtedIdea);
		console.log(newIdea);
		if (!(newIdea.hasOwnProperty('name')) || newIdea.name == ""){
			$scope.showAddNewIdea = true;
			$scope.addNewIdeaResponse = "Please include the author's name."
			return;
		}

		if (!(newIdea.hasOwnProperty('contentType')) || newIdea.contentType == ""){
			$scope.showAddNewIdea = true;
			$scope.addNewIdeaResponse = "Please include the idea's content type."
			return;
		}

		if (!(newIdea.hasOwnProperty('content')) || newIdea.content == ""){
			$scope.showAddNewIdea = true;
			$scope.addNewIdeaResponse = "Please include idea content."
			return;
		}

		$("#newIdea_frm")[0].reset();
		

		//Ean's addition for new API

		var fullNewIdea = {
			"name": newIdea.name,
			"contentType": newIdea.contentType,
			"content": newIdea.content,
			"references": $scope.arrayRefrences,
			"likes": 0
		};

		//Clear reference array
		$scope.arrayRefrences = [];

		var sessionID = $scope.currentSessionID;
		var promptIndex = newIdea.promptIndex;

		$http.post('/api2/sessions/' + sessionID + '/prompts/' + promptIndex + '/ideas/', fullNewIdea).then(function(response){
			//Receiving new idea and pushing to ideas array of current prompt
			console.log(response.data);
			//Update all clients
			socket.emit('updateIdeas', promptIndex);
		});

		//End Ean's addition


		/*
		var ideaID = cPrompt.ideas.length + 1;
		var fullNewIdea = {
			"ID": incomingID + "." + ideaID,
			"name": newIdea.name,
			"index": authorNumber,
			"time": Date.now(),
			"contentType": newIdea.contentType,
			"content": newIdea.content,
			"refrence":$scope.newIdeaRefrence,
			"likes":0,
		};*/

		//console.log(newIdea.ID);
		//console.log(typeof(newIdea.ID));
		/*
		var incomingID = newIdea.ID;
		var IDArray = String(newIdea.ID).split('.');
		console.log('ID Array: ' + IDArray);
		var promptID = IDArray[1];
		var cPrompt = $scope.allData.prompts[promptID - 1];
		console.log("***");
		console.log(promptID);
		console.log($scope.allData.prompts[promptID]);
		var authorNumber = 1;
		

		for (var i = 0; i < cPrompt.ideas.length ; i++) {
			console.log(cPrompt.ideas[i].name);
			if(newIdea.name == cPrompt.ideas[i].name)
				 authorNumber++;
		};


		var ideaID = cPrompt.ideas.length + 1;
		var fullNewIdea = {
			"ID": incomingID + "." + ideaID,
			"name": newIdea.name,
			"index": authorNumber,
			"time": Date.now(),
			"contentType": newIdea.contentType,
			"content": newIdea.content,
			"refrence":$scope.newIdeaRefrence,
			"likes":0,
		};
		console.log(fullNewIdea.index);

		$scope.newIdeaRefrence = "";
			
		

		//console.log(fullNewIdea);

		$http.post('/addSafeIdea', fullNewIdea).then(function(response){
			//Receiving new idea and pushing to ideas array of current prompt
			//console.log(response.data);
			cPrompt.ideas.push(response.data);

			//Update all clients
			socket.emit('updateIdeas', cPrompt.promptID);

			$scope.showAddRemoteIdea = true;
			$scope.addRemoteIdeaResponse = "Your idea has been submitted."
		});

		*/
	};
	//socket.emit and socket.on must be declared in separate functions
	socket.on('updateIdeas', function(promptIndex){
		console.log('calling update on prompt ' + promptIndex);

		console.log($scope.currentSessionID);
		var sessionID = $scope.currentSessionID;

		$http.get('/api2/sessions/' + sessionID + '/prompts/' + promptIndex).then(function(response) {
			console.log("Updated prompt info");
			console.log(response);
			var updatedIdeas = response.data[0].prompt.ideas;
			$scope.allData.prompts[promptIndex].ideas = updatedIdeas;
		});
/*
			$http.get('/api2/sessions/' +/'+incomingPrompt).then(function(response){
				//console.log(response.data);
				console.log('**');
				var IDArray = String(incomingPrompt).split(".");
			    var mySessionID = Number(IDArray[0]);
			    var promptID = Number(IDArray[1]);
			    var promptIndex = promptID - 1;
				($scope.allData.prompts[promptIndex].ideas) = response.data;
				
			})
*/
	});

	//Like idea based on ideaID
	//Iterate through all ideas and change the value of $scope.allData.ideas[i].likes 
	//to display the new value without refreshing the page
	//Call socket emit to update in real time
	
	$scope.newLike = function(promptIndex, ideaIndex) { 
		
		var sessionID = this.currentSessionID;

		var ideaToLike = this.allData.prompts[promptIndex].ideas[ideaIndex];
		console.log(ideaToLike);

		var like = {"like":1}
		var body = {};
		body["edits"] = like;

		console.log(body);

		$http.post('/api2/sessions/' + sessionID + '/prompts/' + promptIndex + '/ideas/' + ideaIndex, body)
			.then(function(response){
				console.log(response);
				data = {};
				data["promptIndex"] = promptIndex;
				data["ideaIndex"] = ideaIndex;

				socket.emit('updateLike', data)
			})

		/*
		var IDArray = String(incomingID).split(".");
		var sessionID = Number(IDArray[0]);
		var promptID = Number(IDArray[1]);
		var ideaID = Number(IDArray[2]);
		

		var promptIndex = promptID - 1;
		var ideaIndex = ideaID - 1;

		$http.get('/like/'+incomingID).then(function(response){
			
			var cIdea = $scope.allData.prompts[promptIndex].ideas[ideaIndex];
			cIdea.likes = response.data;

			socket.emit('updateLike', incomingID);
		});
*/
	};

	//Show real-time updates of likes by updating the scope value of all other windows
	//Update scope value to current value stored in database 
	socket.on('updateLike', function(data){
		var sessionID = $scope.currentSessionID;
		var promptIndex = data.promptIndex;
		var ideaIndex = data.ideaIndex

		$http.get('/api2/sessions/' + sessionID + '/prompts/' + promptIndex + '/ideas/').then(function(response) {
			console.log(response);
			$scope.allData.prompts[promptIndex].ideas = response.data[0].ideas;

		});

/*		var promptIndex = promptID - 1;
		var ideaIndex = ideaID - 1;

			$http.get('/updateLike/'+receivedIdea).then(function(response){
				var cIdea = $scope.allData.prompts[promptIndex].ideas[ideaIndex];
				cIdea.likes = response.data;
			});
*/	});

	socket.on('error', function (err) {
    	console.log("!error! " + err);
	});


}]);

'use strict';

// Factory to use socket.io service
angularApp.factory('socket', function ($rootScope) {
  var socket = io.connect();
  //Print whether the sockets are connected every 5 seconds (true or false)
  setInterval(function(){ console.log(socket.connected); }, 10000);
  return {
    on: function (eventName, callback) {
      //console.log('general function called');
      socket.on(eventName, function () {  
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      });
    },
    emit: function (eventName, data, callback) {
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      })
    }
  };
});


socket.on('init', function(){
	//console.log('socket on init');
});



