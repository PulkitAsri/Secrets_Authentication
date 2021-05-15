//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
require('dotenv').config();

const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
	extended: true
}));

app.use(session({
	secret: 'hehehehe!',
	resave: false,
	saveUninitialized: true,

}));
app.use(passport.initialize());
app.use(passport.session());

// console.log(process.env);
passport.use(new GoogleStrategy({
		clientID: process.env.CLIENT_ID,
		clientSecret: process.env.CLIENT_SECRET,
		callbackURL: "http://localhost:3000/auth/google/secrets"
	},
	function (accessToken, refreshToken, profile, cb) {
		console.log(profile);
		User.findOrCreate({
			googleId: profile.id
		}, function (err, user) {
			return cb(err, user);
		});
	}
));

//CODE>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

const connectionUrl = "mongodb://localhost:27017/authDemo";

mongoose.connect(connectionUrl, {
	useNewUrlParser: true,
	useUnifiedTopology: true
});
mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema({
	email: String,
	password: String,
	googleId:String
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
	done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
	User.findById(id, function(err, user) {
	  done(err, user);
	});
  });


app.get("/", function (req, res) {
	res.render("home", {});
});
app.get("/auth/google",
	passport.authenticate('google', {
		scope: ["profile"]
	}));

app.get('/auth/google/secrets',
	passport.authenticate('google', {
		failureRedirect: "/login"
	}),
	function (req, res) {
		// Successful authentication, redirect secrets.
		res.redirect("/secrets");
	});
app.get("/register", function (req, res) {
	res.render("register", {});
});
app.get("/login", function (req, res) {
	res.render("login", {});
});
app.get("/secrets", function (req, res) {

	if (req.isAuthenticated()) {
		res.render("secrets");
	} else {
		res.redirect("/register");
	}

});




app.post("/register", function (req, res) {

	const userEmail = req.body.username;
	const userPassword = req.body.password;

	User.register({
		username: userEmail
	}, userPassword, function (err, user) {
		if (err) {
			console.log(err);
			res.redirect("/register");
		} else {
			passport.authenticate("local")(req, res, function () {
				res.redirect("/secrets");
			});
		}
	});

});
app.post("/login", function (req, res) {
	const userFeedEmail = req.body.username;
	const userFeedPassword = req.body.password;

	const user = new User({
		email: userFeedEmail,
		password: userFeedPassword
	});


	req.login(user, function (err) {
		if (err) {
			console.log(err);
		} else {
			passport.authenticate("local")(req, res, function () {
				res.redirect("/secrets");
			});
		}
	});

});

app.get('/logout', function (req, res) {
	req.logout();
	res.redirect('/');
});


//SERVER
app.listen(process.env.PORT || 3000, function () {
	console.log("Server started on port 3000.");
});