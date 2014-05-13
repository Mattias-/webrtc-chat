var makeoffer = null;
var receiveanswer = null;
var makeanswer = null;
var channel = null;
var pc = null;

var dbRef = new Firebase("https://torid-fire-9188.firebaseIO.com/");
var roomRef = dbRef.child("rooms");
// a nice wrapper to send data to FireBase
function send (room, key, data) {
	roomRef.child(room).child(key).set(data);
}

// wrapper function to receive data from FireBase
function recv (room, type, cb) {
	roomRef.child(room).child(type).on("value", function (snapshot, key) {
		var data = snapshot.val();
		if (data) { cb(data); }
	});
}

// generic error handler
function errorHandler (err) {
	console.error(err);
}

// generate a unique-ish string
function id () {
	return (Math.random() * 10000 + 10000 | 0).toString();
}

// determine what type of peer we are,
// offerer or answerer.
var ROOM = location.hash.substr(1);
var type = "answerer";
var otherType = "offerer";

// no room number specified, so create one
// which makes us the offerer
if (!ROOM) {
	ROOM = id();
	type = "offerer";
	otherType = "answerer";

	document.write("<a href='#"+ROOM+"'>Send link to other peer</a>");
}

$(document).ready(function() {
  var servers = {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}]};
  pc = new webkitRTCPeerConnection(servers,
  {optional: [{DtlsSrtpKeyAgreement: true},{RtpDataChannels: true}]});


  pc.onicecandidate = function(){
    if (!event.candidate) { return; }
    pc.onicecandidate = null;
    // request the other peers ICE candidate
    recv(ROOM, "candidate:" + otherType, function (candidate) {
      pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candidate)));
    });

    // send our ICE candidate
    send(ROOM, "candidate:"+type, JSON.stringify(event.candidate));
  };

  makeoffer = function(){
    channel = pc.createDataChannel("mappelgren");//, {reliable: false});
    channel.onerror = function (err) {
      console.error("Channel Error:", err);
    };
    channel.onopen = function () { console.log("Channel Open"); }
    channel.onmessage = function(e){
      var data = JSON.parse(e.data);
      var elem = createMessage(data);
      panel = document.getElementById("chat-panel");
      panel.appendChild(elem);
      panel.scrollTop = panel.scrollHeight;
    };
    pc.createOffer(function(offer){
      pc.setLocalDescription(offer);
      console.log("offer", JSON.stringify(offer));
			send(ROOM, "offer", JSON.stringify(offer));
			recv(ROOM, "answer", receiveanswer);
    });
  };

  makeanswer = function(offer){
    pc.ondatachannel = function(e){
      console.log("ondatachannel",e);
      channel = e.channel;
      channel.onmessage = function(e){
        var data = JSON.parse(e.data);
        addMessage(data);
      };
    };
    pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offer)),
                            function(){
      pc.createAnswer(function (answer) {
        pc.setLocalDescription(answer);
        send(ROOM, "answer", JSON.stringify(answer));
        console.log("answer", JSON.stringify(answer));
      });
    });
  };
  receiveanswer = function(answer){
    pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(answer)));
    console.log("everying is set up, try send something")
  };

  if (type === "offerer") {
    makeoffer();
  } else {
    recv(ROOM, "offer", makeanswer);
  }


  $(".message-form").submit(function(e){
    e.preventDefault();
    $field = $("#message-field");
    var msg = $field.val();
    $field.val("");
    var data = {msg: msg, name: "Unknown"};
    addMessage(data);
    channel.send(JSON.stringify(data));
  });
});

function createMessage(data){
  var elem = document.createElement("div");
  elem.setAttribute("class","chat-panel-message");
  var s = document.createElement("strong");
  var n = document.createTextNode(data.name);
  s.appendChild(n);
  elem.appendChild(s);
  var p = document.createElement("p");
  p.setAttribute("class","small");
  var m = document.createTextNode(data.msg);
  p.appendChild(m);
  elem.appendChild(p);
  return elem;
}

function addMessage(data){
  var elem = createMessage(data);
  panel = document.getElementById("chat-panel");
  panel.appendChild(elem);
  panel.scrollTop = panel.scrollHeight;
}
