// let nforce = require('nforce');
const jsforce = require('jsforce');

let cors = require('cors');
let express = require('express');
var path = require('path');

let app = express();
let faye = require('faye');

const logger = require('heroku-logger');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

app.use(cors());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

/* GET home page. */
app.get('/', function (req, res, next) {
    res.render('index', { title: 'Platform Event Generator' });
});

// post an empty body the the /events endpoint.  Event is defined in config properties
app.get('/events', function (req, res, next) {
    conn.sobject(process.env.EVENT_API_NAME).create(JSON.parse(process.env.EVENT_JSON), function (err, ret) {
        if (err) {
            logger.error(err);
            return res.send(err);
        } else if (!ret.success) {
            logger.error(ret);
            return res.send(ret);
        } else {
            return res.send(ret);
        }
    });
})

// for the double-click event
app.get('/doubleclick', function (req, res) {
    conn.sobject(process.env.DOUBLECLICK_EVENT_API_NAME).create(JSON.parse(process.env.DOUBLECLICK_JSON), function (err, ret) {
        if (err) {
            logger.error(err);
            return res.send(err);
        } else if (!ret.success) {
            logger.error(ret);
            return res.send(ret);
        } else {
            return res.send(ret);
        }
    });
})

// for the press-and-hold event
app.get('/hold', function (req, res) {
    conn.sobject(process.env.HOLD_EVENT_API_NAME).create(JSON.parse(process.env.HOLD_JSON), function (err, ret) {
        if (err) {
            logger.error(err);
            return res.send(err);
        } else if (!ret.success) {
            logger.error(ret);
            return res.send(ret);
        } else {
            return res.send(ret);
        }
    });
})


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

// module.exports = app;
const port = process.env.PORT || 8443;


const server = app.listen(port, () => {
    logger.info(`Example app listening on port ${port}!`);
});

// streaming api stuff
let io = require('socket.io')(server);


let bayeux = new faye.NodeAdapter({ mount: '/faye', timeout: 45 });
bayeux.attach(server);
bayeux.on('disconnect', function (clientId) {
    console.log('Bayeux server disconnect');
});


const loginInfo = {};
const oauth2 = {
    oauth2: {
        clientId: process.env.SFDC_APP_ID,
        clientSecret: process.env.SFDC_APP_SECRET,
        redirectUri: 'https://login.salesforce.com/services/oauth2/callback'
    }
}
if (process.env.environment === 'test') {
    oauth2.loginUrl = 'https://test.salesforce.com';
    oauth2.redirectUri = 'https://test.salesforce.com/services/oauth2/callback';
    console.log('using test.salesforce.com for login');
    console.log(loginInfo);
}

const conn = new jsforce.Connection({ oauth2: oauth2 });

conn.login(process.env.SFDC_USERNAME, process.env.SFDC_PASSWORD, function (err, res) {

    if (err) {
        console.log('login error')
        return console.log(err);
    } else {
        console.log('conected successfully!');
        console.log(res);

        var client = new faye.Client(`${conn.instanceUrl}/cometd/40.0/`);
        client.setHeader('Authorization', 'OAuth ' + conn.accessToken);
        var subscription = client.subscribe('/event/Notification__e', function (notification) {
            // Send message to all connected Socket.io clients
            console.log(notification);
            io.of('/').emit('message', {
                message: notification.payload.Message__c
            });
        });
        subscription.callback(() => console.log('Subscribed'));
        subscription.errback((err) => {
            console.log('failed to subscribe:')
            console.log(err);
        });

    }
});