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
const FacebookStrategy = require('passport-facebook').Strategy;
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

//Google Strategy
passport.use(new GoogleStrategy({
		clientID: process.env.CLIENT_ID,
		clientSecret: process.env.CLIENT_SECRET,
		callbackURL: "http://localhost:3000/auth/google/secrets",
		userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
	},
	function (accessToken, refreshToken, profile, cb) {
		User.findOrCreate({
			googleId: profile.id
		}, function (err, user) {
			return cb(err, user);
		});
	}
));

//Facebook Strategy
passport.use(new FacebookStrategy({
		clientID: process.env.FACEBOOK_APP_ID,
		clientSecret: process.env.FACEBOOK_APP_SECRET,
		callbackURL: "http://localhost:3000/auth/facebook/secrets"
	},
	function (accessToken, refreshToken, profile, cb) {
		User.findOrCreate({
			facebookId: profile.id
		}, function (err, user) {
			return cb(err, user);
		});
	}
));


//Connection Setup MONGOOSE
const connectionUrl = "mongodb://localhost:27017/authDemo";

mongoose.connect(connectionUrl, {
	useNewUrlParser: true,
	useUnifiedTopology: true
});
mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema({
	email: String,
	password: String,
	secret: String,
	googleId: String,
	facebookId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function (user, done) {
	done(null, user.id);
});
passport.deserializeUser(function (id, done) {
	User.findById(id, function (err, user) {
		done(err, user);
	});
});


//ROOT ROUTE
app.get("/", function (req, res) {
	res.render("home", {});
});


//GOOGLE LOGIN/REGISTER
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


//FACEBOOK LOGIN/REGISTER
app.get('/auth/facebook',
	passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
	passport.authenticate('facebook', {
		failureRedirect: '/login'
	}),
	function (req, res) {
		// Successful authentication, redirect home.
		res.redirect('/secrets');
	});


// EMAIL LOGIN/REGISTER

//register
app.get("/register", function (req, res) {
	res.render("register", {});
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

//login
app.get("/login", function (req, res) {
	res.render("login", {});
});
app.post("/login", function (req, res) {
	const userFeedEmail = req.body.username;
	const userFeedPassword = req.body.password;

	const user = new User({
		email: userFeedEmail,
		password: userFeedPassword
	});


	req.login(user, function (err) {
		if (err) console.log(err);
		else {
			passport.authenticate("local")(req, res, function () {
				res.redirect("/secrets");
			});
		}
	});

});

//SECRETS HOME PAGE
app.get("/secrets", function (req, res) {

	//finding all users where secret field is not null
	User.find({
		"secret": {
			$ne: null
		}
	}, function (err, foundUsers) {
		if (err) console.log(err);
		else {
			if (foundUsers) {
				//All the users with a secret 
				res.render("secrets", {
					usersWithSecrets: foundUsers
				});
			}
		}
	})
});


//SUBMIT A SECRET
app.get("/submit", function (req, res) {
	if (req.isAuthenticated()) {
		res.render("submit");
	} else {
		res.redirect("/register");
	}
});
app.post("/submit", function (req, res) {
	const submittedSecret = req.body.secret;

	User.findById(req.user.id, function (err, foundUser) {
		if (err) {
			console.log(err);
		} else {
			if (foundUser) {
				foundUser.secret = submittedSecret;
				// console.log(submittedSecret+" "+req.user.id+" "+foundUser.secret);
				foundUser.save(function () {
					//callback
					res.redirect("/secrets");
				})
			}
		}
	});
});


//LOGOUT
app.get('/logout', function (req, res) {
	req.logout();
	res.redirect('/');
});


//SERVER
app.listen(process.env.PORT || 3000, function () {
	console.log("Server started on port 3000.");
});