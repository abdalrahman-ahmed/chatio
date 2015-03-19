# chatio
Chat.IO app using node.js and socket.io

![](https://raw.githubusercontent.com/abdalrahman-ahmed/chatio/master/Screenshot.png)

## Libraries used

[ [Node.JS](https://nodejs.org/) / [npm](https://www.npmjs.com/) ]

[ [Socket.IO](http://socket.io/) :: [ExpressJS](http://expressjs.com/) :: [node-uuid](https://www.npmjs.com/package/uuid/) :: [underscore](http://underscorejs.org/) :: [ejs](https://www.npmjs.com/package/ejs/) ]

# Functionality
<ol>
  <li>People are able to join the chat server after entering their names</li>
  <li>Usernames are unique - if a username is taken, a new suggestion is generated</li>
  <li>People can setup a room. Room names are unique. One person can create on room and join one room</li>
  <li>Users have to join a room to chat, except for the Private Message feature.</li>
  <li>'Private Messages' can use private messages between two users</li>
  <li>Users can leave a room and/or disconnect from the server anytime</li>
  <li>People joining the room will see the past 10 messages (chat history).</li>
  <li>People will see an 'is typing' message when someone is typing a message.</li>
</ol>

## Setup and configuration

Make sure that you update <strong>index.js</strong>:
<pre>server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});</pre>
and add your own IP address/hostname if required, i.e.:
<pre>server.listen(app.get('port'), "192.168.1.6", function(){
  console.log('Express server listening on port ' + app.get('port'));
});</pre>

(the port is defined in the <code>app.set('port', process.env.PORT || 3000);</code> section.)

Please also update <strong>public/js/client.js</strong>:
<pre>var socket = io.connect("192.168.1.6:3000");</pre>
with the right IP address/hostname.

To install <code>npm install && bower install</code> and to launch run <code>npm start</code>.

Now Visit [Chat.IO DEMO](https://chatio-alcrazy-2.c9.io/)

### Releases

| Version(s)            | Download(s)                  |
| --------------------- | ---------------------------- |
| chat.io.v0.1.0.tar.gz | [Download](http://goo.gl/Ih6kUr)         |
| chat.io.v0.1.1.tar.gz | [Download](http://goo.gl/QJKYqM)         |