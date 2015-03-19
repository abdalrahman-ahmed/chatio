/* HTML5 magic
- GeoLocation
- WebSpeech
*/

//WebSpeech API
var final_transcript = '';
var recognizing = false;
var last10messages = []; //to be populated later
var username = '';

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

window.myRoomName = '';

$(document).ready(function() {

  $('head').append('<link rel="stylesheet" type="text/css" href="extjs/css/ext-all-neptune-debug.css"><script type="text/javascript" src="extjs/js/ext-all.js"></script><script type="text/javascript" src="extjs/js/ext-theme-neptune.js"></script><link rel="stylesheet" type="text/css" href="extjs/css/tabs.css"><script type="text/javascript" src="extjs/js/TabScrollerMenu.js"></script><script type="text/javascript" src="extjs/js/TabCloseMenu.js"></script><script type="text/javascript" src="extjs/js/tab-scroller-menu.js"></script>');

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
  $("#nameForm").submit(function(){
    var name = ($("#name").val().trim());
    if(/([\+-\.,!@#\$%\^&\*\(\);\/\|<>"'_\\]+)/.test(name) || name.length === 0 || name.length > 15){
      alert('error: Please Enter a valid name');
      return;
    }
    name = htmlspecialchars(name);
    var device = navigator.userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i) ? "mobile" : "laptop";
    if(name === "" || name.length < 2){
      $("#errors").empty();
      $("#errors").append("Please enter a name");
      $("#errors").show();
    }else{
        username = name;
        $(".welcome-msg[name]").attr("name",username);
        socket.emit("joinserver", name, device);
        toggleNameForm();
        toggleChatWindow();
        addTab('check','<ul></ul>',false,'fa fa-circle status');
        addTab('الحاله','<ul id="msgs" class="list-unstyled"></ul>',false,'fa fa-circle status');
        tabs.remove(0);
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
    if(typeof(tabs.activeTab) !== 'undefined' && 'title' in tabs.activeTab && tabs.activeTab.title !== 'Status'){
        if($("#msg").val().length === 0) return;
        var msg = htmlspecialchars($("#msg").val());
        if (msg !== "") {
          if(tabs.activeTab.title !== ''){
              var nameTab = tabs.activeTab.title;
              var from = false;
              for (var i = 0; i < tabs.items.length; i++) {
                  if(tabs.getComponent(i).title == nameTab){
                      from = true;
                      exiTabId = i;
                      break;
                  }
              }
              if(from){
                  if(myRoomName !== nameTab){
                      var elTab = $(tabs.getComponent(exiTabId).body.dom.firstChild.firstChild.firstChild);
                      elTab.append("<li><strong><span class='text-muted'>&lt;" + username + "&gt;</span></strong> " + msg + "</li>");
                      tabs.getComponent(exiTabId).show();
                  }
                  msg = (typeof(myRoomName) !== 'undefined' && myRoomName === nameTab) ? msg : {to:nameTab,msg:msg};
                  socket.emit("send",msg);
                  $("#msg").val("");
              }
          }
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
      if(typing === false && myRoomID !== null && $("#msg").is(":focus")){
        typing = true;
        socket.emit("typing", true);
      }else{
        clearTimeout(timeout);
        timeout = setTimeout(timeoutFunction, 5000);
      }
    }
  });

  $("#msg").focus(function(e){
    $(tabs.activeTab.tab.el.dom).removeClass('newMsg');
  });

  socket.on("isTyping", function(data) {
    if (data.isTyping) {
      if ($("#"+data.person+"").length === 0 && username !== data.person) {
        $("#updates").append("<li id='"+ data.person +"'><span class='text-muted'><small><i class='fa fa-keyboard-o'></i> " + data.person + " يكتُب. </small></li>");
        timeout = setTimeout(timeoutFunction, 5000);
      }
    } else {
      $("#"+data.person+"").remove();
    }
  });

  $('#tab1 a[href="#peoples"]').tab('show');

  $("#showCreateRoom").click(function() {
    $("#createRoomForm").toggle();
  });

  $("#createRoomBtn").click(function() {
    var roomExists = false;
    if(/([\+-\.,!@#\$%\^&\*\(\);\/\|<>"'_\\]+)/.test($("#createRoomName").val()) || $("#createRoomName").val().length === 0 || $("#createRoomName").val().length > 20){
      $("#errors").empty();
      $("#errors").show();
      $("#errors").append("<b>خطأ: </b> من فضلك ادخل اسم صالح.<br /> أستخدم الاحرف الابجديه العربيه او الانجليزيه والارقام");
      $("#errors").delay(10000).fadeOut(1000);
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
          myRoomName = roomName;
          addTab(myRoomName,'<ul name="msgs" class="list-unstyled"></ul>',true,'fa fa-users');
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
    addTab(roomName,'<ul name="msgs" class="list-unstyled"></ul>',true,'fa fa-users');
    socket.emit("joinRoom", roomID);
    myRoomName = roomName;
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
    location.href = "/";
  });

  $("#people").on('click', '.whisper', function() {
    var name = htmlspecialchars($(this).attr('name'));
    addTab(name,'<ul name="msgs" class="list-unstyled"></ul>',true,'fa fa-user');
    //$("#msg").val("w:"+name+":");
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

socket.on("history", function(data) {
  if (data.length !== 0) {
    $("#msgs").append("<li><span class='text-warning'><b>اخر عشرة رسايل:</b></li>");
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
    $('#people').append("<li class='list-group-item active'>متواجديين الان <span class=\"badge\">"+(parseInt(data.count) - 1)+"</span></li>");
    $.each(data.people, function(a, obj) {
      if(obj.name !== username){
        $('#people').append('<li class="list-group-item"><span>'+ htmlspecialchars(obj.name) +'</span> <a class="devic"><i class="fa fa-'+obj.device+'"></i></a><a href="#" class="whisper btn btn-xs btn-info" name="'+htmlspecialchars(obj.name)+'"><i class="fa fa-envelope-o"></i><div class="msgnm">رساله</div></a></li>')
      }
    });
    if((parseInt(data.count) - 1) < 1){
      $("#people").append("<li class=\"list-group-item\">لا يوجد أشخاص حتى الان</li>");
    }
  });

  socket.on("chat", function(person, msg) {
    console.log(person);
    var found = false;
    for (var i = 0; i < tabs.items.length; i++) {
        if(tabs.getComponent(i).title === myRoomName){
            found = true;
            exiTabId = i;
            break;
        }
    }
    if(found){
        var elTab = $(tabs.getComponent(exiTabId).body.dom.firstChild.firstChild.firstChild);
        elTab.append("<li><span class='text-muted'><b>&lt;" + htmlspecialchars(person) + "&gt;</b></span> " + htmlspecialchars_decode(msg) + "</li>");
        if(person !== username){
          $(tabs.getComponent(exiTabId).tab.el.dom).addClass('newMsg');
        }
    }
    //clear typing field
     $("#"+person.name+"").remove();
     clearTimeout(timeout);
     timeout = setTimeout(timeoutFunction, 0);
  });

  socket.on("whisper", function(person, msg) {
    console.log("user:",person.name);
    var found = false;
    for (var i = 0; i < tabs.items.length; i++) {
        if(tabs.getComponent(i).title === person.name){
            found = true;
            exiTabId = i;
            break;
        }
    }
    if(found){
        var elTab = $(tabs.getComponent(exiTabId).body.dom.firstChild.firstChild.firstChild);
        elTab.append("<li><strong><span class='text-muted'>&lt;" + htmlspecialchars(person.name) + "&gt;</span></strong> " + htmlspecialchars_decode(msg) + "</li>");
        $(tabs.getComponent(exiTabId).tab.el.dom).addClass('newMsg');
        //tabs.getComponent(exiTabId).show();
    }else{
        tabs.add({
            closable: true,
            html: "<ul name='mesg' class='list-unstyled'><li><strong><span class='text-muted'>&lt;" + htmlspecialchars(person.name) + "&gt;</span></strong> " + htmlspecialchars_decode(msg) + "</li></ul>",
            iconCls: 'fa fa-user',
            title: person.name
        });
        $(tabs.getComponent((tabs.items.length - 1)).tab.el.dom).addClass('newMsg');
    }
    //$("#msgs").append("<li><strong><span class='text-muted'>&lt;" + htmlspecialchars(person.name) + "&gt;</span></strong> " + htmlspecialchars_decode(msg) + "</li>");
  });

  socket.on("roomList", function(data) {
    $("#rooms").text("");
    $("#rooms").append("<li class=\"list-group-item active\">قائمة الغُرف <span class=\"badge\">"+data.count+"</span></li>");
     if (!jQuery.isEmptyObject(data.rooms)) { 
      $.each(data.rooms, function(id, room) {
        var rm = '';
        var own = "<button id="+id+" class='joinRoomBtn btn btn-success btn-xs'><b>إنضمام</b><i class='fa fa-plus'></i></button>";
        if(myRoomName === room.name){
          rm = "<button id="+id+" class='removeRoomBtn btn btn-danger btn-xs'><i class='fa fa-trash'></i></button>";
          own = "";
        }
        var html = rm + " " + own;
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
    $("#msgs").append("<li><span class='text-warning'><b>الملقم غير متاح الان.</b></span></li>");
    $("#msg").attr("disabled", "disabled");
    $("#send").attr("disabled", "disabled");
  });

});