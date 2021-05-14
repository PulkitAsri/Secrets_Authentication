//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
const saltRounds = 10;

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
	extended: true
}));

//CODE>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

const connectionUrl = "mongodb://localhost:27017/authDemo";

mongoose.connect(connectionUrl, {
	useNewUrlParser: true,
	useUnifiedTopology: true
});

const userScema = new mongoose.Schema({
	email: String,
	password: String
});
const User = new mongoose.model("User", userScema);



app.get("/", function (req, res) {
	res.render("home", {});
});
app.get("/register", function (req, res) {
	res.render("register", {});
});
app.get("/login", function (req, res) {
	res.render("login", {});
});


app.post("/register", function (req, res) {

	const userEmail = req.body.username;
	const userPassword = req.body.password;

	bcrypt.hash(userPassword, saltRounds, function(err, hash) {
		// Store hash in your password DB.
		const user = new User({
			email: userEmail,
			password: hash
		});
	
		user.save(function (err) {
			if (!err) {
				res.render("secrets", {});
			}
		});
	});
	
});
app.post("/login", function (req, res) {

	const userFeedEmail = req.body.username;
	const userFeedPassword = req.body.password;

	User.findOne({
		email: userFeedEmail
	}, function (err, foundUser) {
		if (err) {
			console.log(err);
		} else {
			bcrypt.compare(userFeedPassword, foundUser.password, function(err, result) {
				if(result===true){
					res.render("secrets", {});
				}
			});
		}
	});
});


//SERVER
app.listen(process.env.PORT || 3000, function () {
	console.log("Server started on port 3000.");
});