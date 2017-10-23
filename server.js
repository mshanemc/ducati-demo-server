require('dotenv').config();

let nforce = require('nforce');
let cors = require('cors');
let express = require('express');
let app = express();
let server = require('http').Server(app);
let faye = require('faye');
let io = require('socket.io')(server);

app.use(cors());

let PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Express server listening on port: ' + PORT));

let bayeux = new faye.NodeAdapter({mount: '/faye', timeout: 45});
bayeux.attach(server);
bayeux.on('disconnect', function(clientId) {
    console.log('Bayeux server disconnect');
});


// Connect to Salesforce
let SF_CLIENT_ID = process.env.SF_CLIENT_ID;
let SF_CLIENT_SECRET = process.env.SF_CLIENT_SECRET;
let SF_USER_NAME = process.env.SF_USER_NAME;
let SF_USER_PASSWORD = process.env.SF_USER_PASSWORD;


let org = nforce.createConnection({
    clientId: SF_CLIENT_ID,
    clientSecret: SF_CLIENT_SECRET,
    environment: 'production',
    redirectUri: 'http://localhost:3000/oauth/_callback',
    mode: 'single',
    autoRefresh: true
});


org.authenticate({username: SF_USER_NAME, password: SF_USER_PASSWORD}, err => {
    if (err) {
        console.error("Salesforce authentication error");
        console.error(err);
    } else {
        console.log("Salesforce authentication successful");
        subscribeToPlatformEvents();
    }
});


let subscribeToPlatformEvents = () => {
    var client = new faye.Client(org.oauth.instance_url + '/cometd/40.0/');
    client.setHeader('Authorization', 'OAuth ' + org.oauth.access_token);
    client.subscribe('/event/Notification__e', function(notification) {
        // Send message to all connected Socket.io clients
        console.log(notification);
        io.of('/').emit('message', {
            message: notification.payload.Message__c
        });
    });
};