var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const { MongoClient } = require('mongodb')
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var accounntsRouter = require('./routes/accounts')
var passport = require('passport')
var session = require('express-session')
var MongoDBStore = require('connect-mongodb-session')(session);
var flash = require('connect-flash');
var bodyParser = require('body-parser')
var app = express();
//create database
const dburl = 'mongodb://localhost:27017';
const BaseFiles = __dirname+'\\MawinguFiles'
const dbName = 'MawingCloud';
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');



app.use(logger('dev'));
app.use(express.json());
 app.use(express.urlencoded({ extended: false }));

// app.use(cookieParser());
var store = new MongoDBStore({
  uri: dburl+'/'+dbName,
  collection: 'mawingu_sessions',
  expires: 1000 * 60 * 60 * 3,
});
store.on('error', function(error) {
  console.log(error);
});
app.use(session({
  name:"myapp",
  secret: "cats",
  httpOnly:true,
  cookie: {

    maxAge: 1000*60*60*3 // 1 week
  },
  maxAge:1000*60*60 *3,
  resave:false,
  saveUninitialized:false,
  store:store
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/accounts',accounntsRouter);



let db
let dbClient = new MongoClient(dburl,
    { useUnifiedTopology: true,useNewUrlParser: true}
)

dbClient.connect(function(err) {
  if (err) throw err;
  db = dbClient.db(dbName);
  app.locals.db = db;
  exports.mydb = db;

  console.log('Connected to database successful');

});
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

//console.log(__dirname+'\\MawinguFiles')
// error handler
app.use(function(err, req, res, next) {
  //set locals, only providing error in development
  res.locals.message =err.message;

  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  console.log(err.message)
  res.render('error');
  // res.locals.success_msg = req.flash('success_msg');
  // res.locals.error_msg = req.flash('error_msg');
  // res.locals.error = req.flash('error');
  // next();
});

module.exports.BaseFiles = BaseFiles
module.exports.app = app



process.on('SIGINT', () => {
  dbClient.close();
  process.exit();
});
app.listen(8000,()=>{


  console.log("Listening to port 8000")
})