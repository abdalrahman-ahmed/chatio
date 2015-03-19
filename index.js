var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require("socket.io").listen(server,{log:false}), // {log:false} without logs
	uuid = require('node-uuid'),
	Room = require('./lib/room.js'),
	_ = require('underscore')._;

app.configure(function() {
	app.set('port', process.env.OPENSHIFT_NODEJS_PORT || 8080);
  	app.set('ipaddr', process.env.OPENSHIFT_NODEJS_IP || "0.0.0.0");
	app.use(express.json());
	app.use(express.urlencoded());
	app.use(express.methodOverride());
	app.use(express.static(__dirname + '/public'));
	app.use('/components', express.static(__dirname + '/components'));
	app.use('/js', express.static(__dirname + '/js'));
	app.use('/extjs',express.static(__dirname + '/extjs'));
	app.use('/icons', express.static(__dirname + '/icons'));
	app.set('views', __dirname + '/views');
	app.engine('html', require('ejs').renderFile);
});

app.get('/', function(req, res) {
  res.render('index.html');
});

server.listen(app.get('port'), app.get('ipaddr'), function(){
	console.log('Express server listening on  IP: ' + app.get('ipaddr') + ' and port ' + app.get('port'));
});

io.set("log level", 1);
var people = {};
var rooms = {};
var sockets = [];
var chatHistory = {};

function htmlspecialchars(string, quote_style, charset, double_encode) {
  var optTemp = 0,
    i = 0,
    noquotes = false;
  if (typeof quote_style === 'undefined' || quote_style === null) {
    quote_style = 2;
  }
  string = string.toString();
  if (double_encode !== false) { // Put this first to avoid double-encoding
    string = string.replace(/&/g, '&amp;');
  }
  string = string.replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  var OPTS = {
    'ENT_NOQUOTES': 0,
    'ENT_HTML_QUOTE_SINGLE': 1,
    'ENT_HTML_QUOTE_DOUBLE': 2,
    'ENT_COMPAT': 2,
    'ENT_QUOTES': 3,
    'ENT_IGNORE': 4
  };
  if (quote_style === 0) {
    noquotes = true;
  }
  if (typeof quote_style !== 'number') { // Allow for a single string or an array of string flags
    quote_style = [].concat(quote_style);
    for (i = 0; i < quote_style.length; i++) {
      // Resolve string input to bitwise e.g. 'ENT_IGNORE' becomes 4
      if (OPTS[quote_style[i]] === 0) {
        noquotes = true;
      } else if (OPTS[quote_style[i]]) {
        optTemp = optTemp | OPTS[quote_style[i]];
      }
    }
    quote_style = optTemp;
  }
  if (quote_style & OPTS.ENT_HTML_QUOTE_SINGLE) {
    string = string.replace(/'/g, '&#039;');
  }
  if (!noquotes) {
    string = string.replace(/"/g, '&quot;');
  }

  return string;
}

function purge(s, action) {
	/*
	The action will determine how we deal with the room/user removal.
	These are the following scenarios:
	if the user is the owner and (s)he:
		1) disconnects (i.e. leaves the whole server)
			- advise users
		 	- delete user from people object
			- delete room from rooms object
			- delete chat history
			- remove all users from room that is owned by disconnecting user
		2) removes the room
			- same as above except except not removing user from the people object
		3) leaves the room
			- same as above
	if the user is not an owner and (s)he's in a room:
		1) disconnects
			- delete user from people object
			- remove user from room.people object
		2) removes the room
			- produce error message (only owners can remove rooms)
		3) leaves the room
			- same as point 1 except not removing user from the people object
	if the user is not an owner and not in a room:
		1) disconnects
			- same as above except not removing user from room.people object
		2) removes the room
			- produce error message (only owners can remove rooms)
		3) leaves the room
			- n/a
	*/
	if (people[s.id].inroom) { //user is in a room
		var room = rooms[people[s.id].inroom]; //check which room user is in.
		if (s.id === room.owner) { //user in room and owns room
			if (action === "disconnect") {
				io.sockets.in(s.room).emit("update", "لقد غادر الغرفه. الغرفه قد حُذفت وانت غير متصل بها الان (" +people[s.id].name + ") المُنشأ");
				var socketids = [];
				for (var i=0; i<sockets.length; i++) {
					socketids.push(sockets[i].id);
					if(_.contains((socketids)), room.people) {
						sockets[i].leave(room.name);
					}
				}

				if(_.contains((room.people)), s.id) {
					for (var i=0; i<room.people.length; i++) {
						people[room.people[i]].inroom = null;
					}
				}
				room.people = _.without(room.people, s.id); //remove people from the room:people{}collection
				delete rooms[people[s.id].owns]; //delete the room
				delete people[s.id]; //delete user from people collection
				delete chatHistory[room.name]; //delete the chat history
				sizePeople = _.size(people);
				sizeRooms = _.size(rooms);
				io.sockets.emit("update-people", {people: people, count: sizePeople});
				io.sockets.emit("roomList", {rooms: rooms, count: sizeRooms});
				var o = _.findWhere(sockets, {'id': s.id});
				sockets = _.without(sockets, o);
			} else if (action === "removeRoom") { //room owner removes room
				io.sockets.in(s.room).emit("update", "لقد غادر الغرفه. الغرفه قد حُذفت وانت غير متصل بها الان (" +people[s.id].name + ") المُنشأ");
				var socketids = [];
				for (var i=0; i<sockets.length; i++) {
					socketids.push(sockets[i].id);
					if(_.contains((socketids)), room.people) {
						sockets[i].leave(room.name);
					}
				}

				if(_.contains((room.people)), s.id) {
					for (var i=0; i<room.people.length; i++) {
						people[room.people[i]].inroom = null;
					}
				}
				delete rooms[people[s.id].owns];
				people[s.id].owns = null;
				room.people = _.without(room.people, s.id); //remove people from the room:people{}collection
				delete chatHistory[room.name]; //delete the chat history
				sizeRooms = _.size(rooms);
				io.sockets.emit("roomList", {rooms: rooms, count: sizeRooms});
			} else if (action === "leaveRoom") { //room owner leaves room
				io.sockets.in(s.room).emit("update", "لقد غادر الغرفه. الغرفه قد حُذفت وانت غير متصل بها الان (" +people[s.id].name + ") المُنشأ");
				var socketids = [];
				for (var i=0; i<sockets.length; i++) {
					socketids.push(sockets[i].id);
					if(_.contains((socketids)), room.people) {
						sockets[i].leave(room.name);
					}
				}

				if(_.contains((room.people)), s.id) {
					for (var i=0; i<room.people.length; i++) {
						people[room.people[i]].inroom = null;
					}
				}
				delete rooms[people[s.id].owns];
				people[s.id].owns = null;
				room.people = _.without(room.people, s.id); //remove people from the room:people{}collection
				delete chatHistory[room.name]; //delete the chat history
				sizeRooms = _.size(rooms);
				io.sockets.emit("roomList", {rooms: rooms, count: sizeRooms});
			}
		} else {//user in room but does not own room
			if (action === "disconnect") {
				io.sockets.emit("update", "غير مُتصل " + people[s.id].name);
				if (_.contains((room.people), s.id)) {
					var personIndex = room.people.indexOf(s.id);
					room.people.splice(personIndex, 1);
					s.leave(room.name);
				}
				delete people[s.id];
				sizePeople = _.size(people);
				io.sockets.emit("update-people", {people: people, count: sizePeople});
				var o = _.findWhere(sockets, {'id': s.id});
				sockets = _.without(sockets, o);
			} else if (action === "removeRoom") {
				s.emit("update", "فقط من انشأ الغرفه يستطيع إزالتها");
			} else if (action === "leaveRoom") {
				if (_.contains((room.people), s.id)) {
					var personIndex = room.people.indexOf(s.id);
					room.people.splice(personIndex, 1);
					people[s.id].inroom = null;
					io.sockets.emit("update", "لقد غادر الغرفة " + people[s.id].name);
					s.leave(room.name);
				}
			}
		}	
	} else {
		//The user isn't in a room, but maybe he just disconnected, handle the scenario:
		if (action === "disconnect") {
			io.sockets.emit("update", "غير مُتصل " + people[s.id].name);
			delete people[s.id];
			sizePeople = _.size(people);
			io.sockets.emit("update-people", {people: people, count: sizePeople});
			var o = _.findWhere(sockets, {'id': s.id});
			sockets = _.without(sockets, o);
		}		
	}
}

io.sockets.on("connection", function (socket) {

	socket.on("joinserver", function(name, device) {
		if(/([\+-\.,!@#\$%\^&\*\(\);\/\|<>"'_\\]+)/.test(name) || name.length === 0 || name.length > 20){
	      return;
	    }
		var exists = false;
		var ownerRoomID = inRoomID = null;

		_.find(people, function(key,value) {
			if (key.name.toLowerCase() === name.toLowerCase())
				return exists = true;
		});
		if (exists) {//provide unique username:
			var randomNumber=Math.floor(Math.random()*1001)
			do {
				proposedName = name+randomNumber;
				_.find(people, function(key,value) {
					if (key.name.toLowerCase() === proposedName.toLowerCase())
						return exists = true;
				});
			} while (!exists);
			socket.emit("exists", {msg: "اسم المستخدم موجود مسبقا، يرجى اختيار واحد آخر. ", proposedName: proposedName});
		} else {
			people[socket.id] = {"name" : name, "owns" : ownerRoomID, "inroom": inRoomID, "device": device};
			socket.emit("update", "انتَ الان مُتصل بالملقم");
			io.sockets.emit("update", " الاُن متصل " + people[socket.id].name)
			sizePeople = _.size(people);
			sizeRooms = _.size(rooms);
			io.sockets.emit("update-people", {people: people, count: sizePeople});
			socket.emit("roomList", {rooms: rooms, count: sizeRooms});
			//socket.emit("joined"); //extra emit for GeoLocation
			/* in client
			socket.on("joined", function() {
			  $("#errors").hide();
			  if (navigator.geolocation) { //get lat lon of user
			    navigator.geolocation.getCurrentPosition(positionSuccess, positionError, { enableHighAccuracy: true });
			  } else {
			    $("#errors").show();
			    $("#errors").append("Your browser is ancient and it doesn't support GeoLocation.");
			  }
			  function positionError(e) {
			    console.log(e);
			  }

			  function positionSuccess(position) {
			    var lat = position.coords.latitude;
			    var lon = position.coords.longitude;
			    //consult the yahoo service
			    $.ajax({
			      type: "GET",
			      url: "https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20geo.placefinder%20where%20text%3D%22"+lat+"%2C"+lon+"%22%20and%20gflags%3D%22R%22&format=json",
			      dataType: "json",
			       success: function(data) {
			        socket.emit("countryUpdate", {country: data.query.results.Result.countrycode});
			      }
			    });
			  }
			});
			*/
			sockets.push(socket);
		}
	});

	socket.on("getOnlinePeople", function(fn) {
                fn({people: people});
        });

	socket.on("countryUpdate", function(data) { //we know which country the user is from
		if(typeof(data) === 'object' && 'country' in data && data.country !== null || data.country.length !== 0){
			country = data.country.toLowerCase();
			people[socket.id].country = country;
			io.sockets.emit("update-people", {people: people, count: sizePeople});
		}
	});

	socket.on("typing", function(data) {
		if (typeof people[socket.id] !== "undefined")
			io.sockets.in(socket.room).emit("isTyping", {isTyping: data, person: people[socket.id].name});
	});
	
	socket.on("send", function(msg) {
		//process.exit(1);
		var found = false;
		if (typeof(msg) === 'object' && msg.to !== undefined) {
			var keys = Object.keys(people);
			if (keys.length != 0) {
				for (var i = 0; i<keys.length; i++) {
					if (people[keys[i]].name === msg.to) {
						var whisperId = keys[i];
						found = true;
						if (socket.id === whisperId) { //can't whisper to ourselves
							socket.emit("update", "لا يمكنك محادثة نفسك");
						}
						break;
					} 
				}
			}
			if (found && socket.id !== whisperId) {
				var whisperMsg = htmlspecialchars(msg.msg);
				//socket.emit("whisper", {name: "You",with:whisperTo}, whisperMsg);
				io.sockets.socket(whisperId).emit("whisper", people[socket.id], whisperMsg);
			} else {
				socket.emit("update",msg.to + "لا يمكن العثور على ");
			}
		} else {
			if (io.sockets.manager.roomClients[socket.id]['/'+socket.room] !== undefined ) {
				io.sockets.in(socket.room).emit("chat", people[socket.id].name, msg);
				socket.emit("isTyping", false);
				if (_.size(chatHistory[socket.room]) > 10) {
					chatHistory[socket.room].splice(0,1);
				} else {
					chatHistory[socket.room].push(people[socket.id].name + ": " + msg);
				}
		    	} else {
				socket.emit("update", "يرجى الاتصال بغرفة.");
		    	}
		}
	});

	socket.on("disconnect", function() {
		if (typeof people[socket.id] !== "undefined") { //this handles the refresh of the name screen
			purge(socket, "disconnect");
		}
	});

	//Room functions
	socket.on("createRoom", function(name) {
		if(/([\+-\.,!@#\$%\^&\*\(\);\/\|<>"'_\\]+)/.test(name) || name.length === 0 || name.length > 20) return;
		if(people[socket.id].inroom && people[socket.id].inroom !== null && people[socket.id].inroom !== ''){
			socket.emit("update", "انتَ داخل غرفه. من فضلك اتركها لتتمكن من إنشاء واحده جديدة");
		}else if (!people[socket.id].owns){
			var id = uuid.v4();
			var room = new Room(name, id, socket.id);
			rooms[id] = room;
			sizeRooms = _.size(rooms);
			io.sockets.emit("roomList", {rooms: rooms, count: sizeRooms});
			//add room to socket, and auto join the creator of the room
			socket.room = name;
			socket.join(socket.room);
			people[socket.id].owns = id;
			people[socket.id].inroom = id;
			room.addPerson(socket.id);
			socket.emit("update", "." + room.name + " اهلاً بك فى");
			socket.emit("sendRoomID", {id: id});
			chatHistory[socket.room] = [];
		}else{
			socket.emit("update", "لقد قمت بالفعل بإنشاء الغرفة.");
		}
	});

	socket.on("check", function(name, fn) {
		var match = false;
		_.find(rooms, function(key,value) {
			if (key.name === name)
				return match = true;
		});
		fn({result: match});
	});

	socket.on("removeRoom", function(id) {
		 var room = rooms[id];
		 if (socket.id === room.owner) {
			purge(socket, "removeRoom");
		} else {
                	socket.emit("update", "فقط من إنشأ هذه الغرفه يستطيع إزالتها.");
		}
	});

	socket.on("joinRoom", function(id) {
		if (typeof people[socket.id] !== "undefined") {
			var room = rooms[id];
			if (socket.id === room.owner) {
				socket.emit("update", "انتَ انشأت هذه الغرفه وانتَ بالفعل متواجد بها");
			} else {
				if (_.contains((room.people), socket.id)) {
					socket.emit("update", "انتَ بالفعل متواجد بالغرفه.");
				} else {
					if (people[socket.id].inroom !== null) {
				    		socket.emit("update", "منفضلك غادر هذه اولاً للنتقال لغرفة اخرى ," + "("+rooms[people[socket.id].inroom].name+")" + "انتَ بالفعل بالغرفة ");
				    	} else {
						room.addPerson(socket.id);
						people[socket.id].inroom = id;
						socket.room = room.name;
						socket.join(socket.room);
						user = people[socket.id];
						io.sockets.in(socket.room).emit("update", room.name + " الان متصل بالغرفة " + user.name);
						socket.emit("update", room.name + " مرحباً بك في ");
						socket.emit("sendRoomID", {id: id});
						var keys = _.keys(chatHistory);
						if (_.contains(keys, socket.room)) {
							socket.emit("history", chatHistory[socket.room]);
						}
					}
				}
			}
		} else {
			socket.emit("update", "الرجاء إدخال اسم صالح اولاً");
		}
	});

	socket.on("leaveRoom", function(id) {
		var room = rooms[id];
		if (room)
			purge(socket, "leaveRoom");
	});
});
