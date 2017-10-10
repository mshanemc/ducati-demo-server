let cors = require('cors');
let express = require('express');
let app = express();
let server = require('http').Server(app);
let PORT = process.env.PORT || 5000;
let faye = require('faye');

app.use(cors());

server.listen(PORT, () => console.log('Express server listening'));

let bayeux = new faye.NodeAdapter({mount: '/faye', timeout: 45});
bayeux.attach(server);
bayeux.on('disconnect', function(clientId) {
    console.log('Bayeux server disconnect');
});