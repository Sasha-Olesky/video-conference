let express = require('express');
let Logger = require('./modules/Logger');
let path = require('path');
let favicon = require('serve-favicon');
let cookieParser = require('cookie-parser');
let bodyParser = require('body-parser');
let session = require('express-session');
let FileStore = require('session-file-store')(session);
let debug = require('debug')('kurentolearning:server');
let https = require('https');
let fs = require("fs");
let SharedSession = require("express-socket.io-session");
let config = require("./config");

let app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'twig');

// uncomment after placing your favicon in /public

// app.use(logger('dev'));
let cors = require("cors");
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('less-middleware')(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

const sessionMidleware = session({
  store: new FileStore(),
  secret: "my-secret",
  resave: true,
  saveUninitialized: true
});
app.use(sessionMidleware);
require('./modules/Routes')(app);


// catch 404 and forward to error handler
app.use((req, res, next) => {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


let port = normalizePort(process.env.PORT || config.NODE_PORT);
app.set('port', port);

/**
 * Create HTTPS server.
 */
let key = fs.readFileSync(config.PATH_TO_SSL_KEY);
let cert = fs.readFileSync(config.PATH_TO_SSL_CERT);
let server = https.createServer({key: key, cert: cert}, app);


let io = require('socket.io')(server, {'pingInterval': 500, 'pingTimeout': 50000});
io.use(SharedSession(sessionMidleware, {
  autoSave: true
}));


require('./modules/WebSockets')(io);

console.log('testing log================>');
/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port, ()=>{Logger.info(`App listen on ${port}`)});
server.on('error', onError);
server.on('listening', onListening);



/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  let port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  let bind = typeof port === 'string'
      ? 'Pipe ' + port
      : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      Logger.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      Logger.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  let addr = server.address();
  let bind = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

