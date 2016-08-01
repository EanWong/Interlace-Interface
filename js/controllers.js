var angularApp = angular.module("myApp", ['ngRoute']);

console.log("starting angular app");

/*angularApp.config([
	'$routeProvider', '$locationProvider', 
	function($routeProvider, $locationProvider) {
  $routeProvider.
  	/*otherwise({
		redirectTo: '/'
	});
	$locationProvider.html5Mode(true);
}]);
*/

angularApp.controller("InterfaceController", 
	['$scope','$http', 'socket', '$route', '$routeParams', '$location', '$window',
	function($scope,$http, socket, $route, $routeParams, $location, $window)
{    
	var vm = this;

	//$scope.name = 'Vivien';
	//console.log($scope.name);

	$scope.$route = $route;
	$scope.$location = $location;
    $scope.$routeParams = $routeParams;

	$http.get('/list').then(function(response){
		$scope.allData = response.data;

		//console.log("***allData***");
		//console.log($scope.allData);
	});

	$http.get('/getAllSessionData').then(function(response){
		//All mongoDB documents
		$scope.allSessions = response.data;
		//console.log("***allSessions***");
		//console.log($scope.allSessions);

		var visibleSessionsArray = [];
		for (var i = 0; i<response.data.length; i++){
			if (response.data[i].visible){
				visibleSessionsArray.push(response.data[i]);
			}
		} 
		$scope.visibleSessions = visibleSessionsArray;
		//console.log($scope.visibleSessions);
	});

	//console.log($scope.allData);
	//console.log("*******");
	//console.log($scope.allSessions);


	socket.on('init', function(){
		//console.log('socket on init');
	});

	$scope.removeSession = function(inputtedSession){
		//console.log(inputtedSession);
		//console.log(typeof(inputtedSession));
		$http.post('/removeSession',inputtedSession).then(function(response){
			//Receiving new session and pushing to sessions array
			($scope.allSessions) = (response.data);

			//Update all clients
			//socket.emit('updateSessions');
		});
	};

	$scope.restoreSession = function(inputtedSession){
		//console.log(inputtedSession);
		//console.log(typeof(inputtedSession));
		$http.post('/restoreSession',inputtedSession).then(function(response){
			//Receiving new session and pushing to sessions array
			($scope.allSessions) = (response.data);

			//Update all clients
			//socket.emit('updateSessions');
		});
	};

	$scope.addSession = function(inputtedSession){
		$("#newSession_frm")[0].reset();
		$scope.newSession = angular.copy(inputtedSession);
		//var savedContent = $scope.allData;
		var fullNewSession = {
			//"ideaID":9,
			"promptTitle":$scope.newSession.promptTitle,
			"promptText":$scope.newSession.promptText,
			"teacherName":$scope.newSession.teacherName,
			"date":$scope.newSession.date,
			"ideas":[],
			"visible":true
		};

		$http.post('/addNewSession',fullNewSession).then(function(response){
			//Receiving new session and pushing to sessions array
			($scope.allSessions).push(response.data);

			//Update all clients
			socket.emit('updateSessions');
		});
	};

	socket.on('updateSessions', function(){
		$http.get('/getAllSessionData/').then(function(response){
			//console.log(response.data);
			$scope.allSessions = response.data;
		})
	});

	$scope.useSession = function(inputtedSession){
		$http.post('/setSession',inputtedSession).then(function(response){
		})
	};

	$scope.addIdea = function(InputtedIdea){
		$("#newIdea_frm")[0].reset();
		$scope.newIdea = angular.copy(InputtedIdea);
		var savedContent = $scope.allData;
		var fullNewIdea = {
			"ideaID": savedContent.ideas.length + 1,
			"name": $scope.newIdea.name,
			"time": Date.now(),
			"contentType": $scope.newIdea.contentType,
			"content": $scope.newIdea.content,
			"likes":0
		};
		$http.post('/addNewIdea',fullNewIdea).then(function(response){
			//Receiving new idea and pushing to ideas array
			($scope.allData.ideas).push(response.data);

			//Update all clients
			socket.emit('updateIdeas');
		});
	};
	socket.on('updateIdeas', function(){
			$http.get('/updateIdeas/').then(function(response){
				($scope.allData.ideas) = response.data;
			})
	});

	


	$scope.newLike = function(incomingID) { 
		//console.log("CLIENT LIKING IDEA: " + incomingID);
		$http.get('/like/'+incomingID).then(function(response){
			//console.log(response.data);
			var ideasArray = $scope.allData.ideas;
			for (var i = 0; i<ideasArray.length; i++){
				var currentID = ideasArray[i].ideaID;
				if (currentID===incomingID){
					$scope.allData.ideas[i].likes = response.data;
					socket.emit('updateLike',incomingID);
				}
			}
		});
	};

	socket.on('updateLike', function(receivedIdea){
			//console.log('received emit');
			//console.log('updating like of idea '+receivedIdea);
			$http.get('/updateLike/'+receivedIdea).then(function(response){
				//alert(response.data);
				//console.log(response.data);
				var ideasArray = $scope.allData.ideas;
				for (var i = 0; i<ideasArray.length; i++){
					var currentID = ideasArray[i].ideaID;
					if (currentID===receivedIdea){
						$scope.allData.ideas[i].likes = response.data;
					}
	 
	      		}
			})
	});

	socket.on('updateAll', function(receivedIdea){
		$http.get('/list').then(function(response){
			$scope.allData = response.data;
		})
	});

	socket.on('error', function (err) {
    	console.log("!error! " + err);
	});

}]);

'use strict';

// Demonstrate how to register services
// In this case it is a simple value service .
angularApp.factory('socket', function ($rootScope) {
  //console.log('in app factory');
  var socket = io.connect();
  //console.log(socket.connected);
  setInterval(function(){ console.log(socket.connected); }, 5000);
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


