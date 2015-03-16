function htmlentities(string, quote_style, charset, double_encode) {
  //  discuss at: http://phpjs.org/functions/htmlentities/
  // original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  //  revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  //  revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // improved by: nobbler
  // improved by: Jack
  // improved by: Rafał Kukawski (http://blog.kukawski.pl)
  // improved by: Dj (http://phpjs.org/functions/htmlentities:425#comment_134018)
  // bugfixed by: Onno Marsman
  // bugfixed by: Brett Zamir (http://brett-zamir.me)
  //    input by: Ratheous
  //  depends on: get_html_translation_table
  //   example 1: htmlentities('Kevin & van Zonneveld');
  //   returns 1: 'Kevin &amp; van Zonneveld'
  //   example 2: htmlentities("foo'bar","ENT_QUOTES");
  //   returns 2: 'foo&#039;bar'

  var hash_map = this.get_html_translation_table('HTML_ENTITIES', quote_style),
    symbol = '';
  string = string == null ? '' : string + '';

  if (!hash_map) {
    return false;
  }

  if (quote_style && quote_style === 'ENT_QUOTES') {
    hash_map["'"] = '&#039;';
  }

  if ( !! double_encode || double_encode == null) {
    for (symbol in hash_map) {
      if (hash_map.hasOwnProperty(symbol)) {
        string = string.split(symbol)
          .join(hash_map[symbol]);
      }
    }
  } else {
    string = string.replace(/([\s\S]*?)(&(?:#\d+|#x[\da-f]+|[a-zA-Z][\da-z]*);|$)/g, function(ignore, text, entity) {
      for (symbol in hash_map) {
        if (hash_map.hasOwnProperty(symbol)) {
          text = text.split(symbol)
            .join(hash_map[symbol]);
        }
      }

      return text + entity;
    });
  }

  return string;
}

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
/* HTML5 magic
- GeoLocation
- WebSpeech
*/

//WebSpeech API
var final_transcript = '';
var recognizing = false;
var last10messages = []; //to be populated later

if (!('webkitSpeechRecognition' in window)) {
  console.log("webkitSpeechRecognition is not available");
} else {
  var recognition = new webkitSpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = function() {
    recognizing = true;
  };

  recognition.onresult = function(event) {
    var interim_transcript = '';
    for (var i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        final_transcript += event.results[i][0].transcript;
        $('#msg').addClass("final");
        $('#msg').removeClass("interim");
      } else {
        interim_transcript += event.results[i][0].transcript;
        $("#msg").val(interim_transcript);
        $('#msg').addClass("interim");
        $('#msg').removeClass("final");
      }
    }
    $("#msg").val(final_transcript);
    };
  }

  function startButton(event) {
    if (recognizing) {
      recognition.stop();
      recognizing = false;
      $("#start_button").prop("value", "Record");
      return;
    }
    final_transcript = '';
    recognition.lang = "en-GB"
    recognition.start();
    $("#start_button").prop("value", "Recording ... Click to stop.");
    $("#msg").val();
  }
//end of WebSpeech

/*
Functions
*/
function toggleNameForm() {
   $("#login-screen").toggle();
}

function toggleChatWindow() {
  $("#main-chat-screen").toggle();
}

$(document).ready(function() {
  //setup "global" variables first
  var socket = io.connect(location.protocol+"//"+location.hostname+"/");
  var myRoomID = null;

  $("form").submit(function(event) {
    event.preventDefault();
  });

  $("#conversation").bind("DOMSubtreeModified",function() {
    $("#conversation").animate({
        scrollTop: $("#conversation")[0].scrollHeight
      });
  });

  $("#main-chat-screen").hide();
  $("#errors").hide();
  $("#name").focus();
  $("#join").attr('disabled', 'disabled'); 
  
  if ($("#name").val() === "") {
    $("#join").attr('disabled', 'disabled');
  }

  //enter screen
  $("#nameForm").submit(function() {
    if(/([\+-\.,!@#\$%\^&\*\(\);\/\|<>"'_\\]+)/.test($("#name").val()) || $("#name").val().length === 0 || $("#name").val().length > 20){
      alert('error: Please Enter a valid name');
      return;
    }
    var name = htmlspecialchars($("#name").val());
    var device = "desktop";
    if (navigator.userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i)) {
      device = "mobile";
    }
    if (name === "" || name.length < 2) {
      $("#errors").empty();
      $("#errors").append("Please enter a name");
      $("#errors").show();
    } else {
      socket.emit("joinserver", name, device);
      toggleNameForm();
      toggleChatWindow();
      $("#msg").focus();
    }
  });

  $("#name").keypress(function(e){
    var name = htmlspecialchars($("#name").val());
    if(name.length < 2) {
      $("#join").attr('disabled', 'disabled'); 
    } else {
      $("#errors").empty();
      $("#errors").hide();
      $("#join").removeAttr('disabled');
    }
  });

  //main chat screen
  $("#chatForm").submit(function() {
    if($("#msg").val().length === 0){
      alert('error:please write your message');
    }else{
      var msg = htmlspecialchars($("#msg").val());
      if (msg !== "") {
        socket.emit("send", msg);
        $("#msg").val("");
      }
    }
  });

  //'is typing' message
  var typing = false;
  var timeout = undefined;

  function timeoutFunction() {
    typing = false;
    socket.emit("typing", false);
  }

  $("#msg").keypress(function(e){
    if (e.which !== 13) {
      if (typing === false && myRoomID !== null && $("#msg").is(":focus")) {
        typing = true;
        socket.emit("typing", true);
      } else {
        clearTimeout(timeout);
        timeout = setTimeout(timeoutFunction, 5000);
      }
    }
  });

  socket.on("isTyping", function(data) {
    if (data.isTyping) {
      if ($("#"+data.person+"").length === 0) {
        $("#updates").append("<li id='"+ data.person +"'><span class='text-muted'><small><i class='fa fa-keyboard-o'></i> " + data.person + " يكتُب. </small></li>");
        timeout = setTimeout(timeoutFunction, 5000);
      }
    } else {
      $("#"+data.person+"").remove();
    }
  });


/*
  $("#msg").keypress(function(){
    if ($("#msg").is(":focus")) {
      if (myRoomID !== null) {
        socket.emit("isTyping");
      }
    } else {
      $("#keyboard").remove();
    }
  });

  socket.on("isTyping", function(data) {
    if (data.typing) {
      if ($("#keyboard").length === 0)
        $("#updates").append("<li id='keyboard'><span class='text-muted'><i class='fa fa-keyboard-o'></i>" + data.person + " is typing.</li>");
    } else {
      socket.emit("clearMessage");
      $("#keyboard").remove();
    }
    console.log(data);
  });
*/

  $("#showCreateRoom").click(function() {
    $("#createRoomForm").toggle();
  });

  $("#createRoomBtn").click(function() {
    var roomExists = false;
    if(/([\+-\.,!@#\$%\^&\*\(\);\/\|<>"'_\\]+)/.test($("#createRoomName").val()) || $("#createRoomName").val().length === 0 || $("#createRoomName").val().length > 20){
      alert('error:please enter a valid name');
      return;
    }
    var roomName = htmlspecialchars($("#createRoomName").val());
    socket.emit("check", roomName, function(data) {
      roomExists = data.result;
       if (roomExists) {
          $("#errors").empty();
          $("#errors").show();
          $("#errors").append("Room <i>" + roomName + "</i> already exists");
        } else {      
        if (roomName.length > 0) { //also check for roomname
          socket.emit("createRoom", roomName);
          $("#errors").empty();
          $("#errors").hide();
          }
        }
    });
  });

  $("#rooms").on('click', '.joinRoomBtn', function() {
    var roomName = $(this).siblings("span").text();
    var roomID = $(this).attr("id");
    socket.emit("joinRoom", roomID);
  });

  $("#rooms").on('click', '.removeRoomBtn', function() {
    var roomName = $(this).siblings("span").text();
    var roomID = $(this).attr("id");
    socket.emit("removeRoom", roomID);
    $("#createRoom").show();
  }); 

  $("#leave").click(function() {
    var roomID = myRoomID;
    socket.emit("leaveRoom", roomID);
    $("#createRoom").show();
  });
  
  $("#disconnect").click(function() {
    var roomID = myRoomID;
    socket.emit("leaveRoom", roomID);
    $("#createRoom").show();
  });

  $("#people").on('click', '.whisper', function() {
    var name = $(this).siblings("span").text();
    $("#msg").val("w:"+htmlspecialchars(name)+":");
    $("#msg").focus();
  });
/*
  $("#whisper").change(function() {
    var peopleOnline = [];
    if ($("#whisper").prop('checked')) {
      console.log("checked, going to get the peeps");
      //peopleOnline = ["Tamas", "Steve", "George"];
      socket.emit("getOnlinePeople", function(data) {
        $.each(data.people, function(clientid, obj) {
          console.log(obj.name);
          peopleOnline.push(obj.name);
        });
        console.log("adding typeahead")
        $("#msg").typeahead({
            local: peopleOnline
          }).each(function() {
            if ($(this).hasClass('input-lg'))
              $(this).prev('.tt-hint').addClass('hint-lg');
        });
      });
      
      console.log(peopleOnline);
    } else {
      console.log('remove typeahead');
      $('#msg').typeahead('destroy');
    }
  });
  // $( "#whisper" ).change(function() {
  //   var peopleOnline = [];
  //   console.log($("#whisper").prop('checked'));
  //   if ($("#whisper").prop('checked')) {
  //     console.log("checked, going to get the peeps");
  //     peopleOnline = ["Tamas", "Steve", "George"];
  //     // socket.emit("getOnlinePeople", function(data) {
  //     //   $.each(data.people, function(clientid, obj) {
  //     //     console.log(obj.name);
  //     //     peopleOnline.push(obj.name);
  //     //   });
  //     // });
  //     //console.log(peopleOnline);
  //   }
  //   $("#msg").typeahead({
  //         local: peopleOnline
  //       }).each(function() {
  //         if ($(this).hasClass('input-lg'))
  //           $(this).prev('.tt-hint').addClass('hint-lg');
  //       });
  // });
*/

//socket-y stuff
socket.on("exists", function(data) {
  $("#errors").empty();
  $("#errors").show();
  $("#errors").append(htmlspecialchars(data.msg) + " جرب  <strong>" + htmlspecialchars(data.proposedName) + "</strong> ");
    toggleNameForm();
    toggleChatWindow();
});

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

socket.on("history", function(data) {
  if (data.length !== 0) {
    $("#msgs").append("<li><strong><span class='text-warning'>Last 10 messages:</li>");
    $.each(data, function(data, msg) {
      $("#msgs").append("<li><span class='text-warning'>" + htmlspecialchars(msg) + "</span></li>");
    });
  } else {
    $("#msgs").append("<li><strong><span class='text-warning'>لا توجد رسائل من قبل</li>");
  }
});

  socket.on("update", function(msg) {
    $("#msgs").append("<li>" + htmlspecialchars(msg) + "</li>");
  });

  socket.on("update-people", function(data){
    //var peopleOnline = [];
    $("#people").empty();
    $('#people').append("<li class='list-group-item active'>متواجديين الان <span class=\"badge\">"+parseInt(data.count)+"</span></li>");
    $.each(data.people, function(a, obj) {
      if (!("country" in obj)) {
        html = "";
      } else {
        html = "<img class='flag flag-"+obj.country+"'/>";
      }
      $('#people').append("<li class='list-group-item'><span>" + htmlspecialchars(obj.name) + "</span> <i class='fa fa-"+obj.device+"'></i> " + html + " <a href='#' class='whisper btn btn-xs'>خاص</a></li>");
      //peopleOnline.push(obj.name);
    });

    /*var whisper = $("#whisper").prop('checked');
    if (whisper) {
      $("#msg").typeahead({
          local: peopleOnline
      }).each(function() {
         if ($(this).hasClass('input-lg'))
              $(this).prev('.tt-hint').addClass('hint-lg');
      });
    }*/
  });

  socket.on("chat", function(person, msg) {
    $("#msgs").append("<li><strong>:<span class='text-success'>" + htmlspecialchars(person.name) + " </span></strong> " + htmlspecialchars(msg) + "</li>");
    //clear typing field
     $("#"+person.name+"").remove();
     clearTimeout(timeout);
     timeout = setTimeout(timeoutFunction, 0);
  });

  socket.on("whisper", function(person, msg) {
    if (person.name === "You") {
      s = "خاص";
      person.name = "أنت";
    } else {
      s = "خاص معلك";
    }
    $("#msgs").append("<li><strong><span class='text-muted'>" + htmlspecialchars(person.name) + "</span></strong> "+htmlspecialchars(s)+": " + htmlspecialchars(msg) + "</li>");
  });

  socket.on("roomList", function(data) {
    $("#rooms").text("");
    $("#rooms").append("<li class=\"list-group-item active\">قائمة الغُرف <span class=\"badge\">"+data.count+"</span></li>");
     if (!jQuery.isEmptyObject(data.rooms)) { 
      $.each(data.rooms, function(id, room) {
        var html = "<button id="+id+" class='removeRoomBtn btn btn-default btn-xs'>حذف</button>" + " " + "<button id="+id+" class='joinRoomBtn btn btn-default btn-xs' >إنضمام</button>";
        $('#rooms').append("<li id="+id+" class=\"list-group-item\"><span>" + htmlspecialchars(room.name) + "</span> " + html + "</li>");
      });
    } else {
      $("#rooms").append("<li class=\"list-group-item\">لا توجد غُرف حتى الان</li>");
    }
  });

  socket.on("sendRoomID", function(data) {
    myRoomID = data.id;
  });

  socket.on("disconnect", function(){
    $("#msgs").append("<li><strong><span class='text-warning'>الملقم غير متاح الان.</span></strong></li>");
    $("#msg").attr("disabled", "disabled");
    $("#send").attr("disabled", "disabled");
  });

});
