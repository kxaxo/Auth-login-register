//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");



const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended:true }));
app.use(express.static("public"));
app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB")
const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    googleId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id)
        .then(user => {
            done(null, user);
        })
        .catch(err => {
            done(err, null);
        });
});


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    function(accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));



app.get("/", (req, res) => {
    res.render("home.ejs");
});

app.get("/auth/google",
    passport.authenticate('google', { scope: ["profile"] })
);

app.get('/auth/google/secrets', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
        // Successful authentication, redirect home.
        res.redirect("/secrets");
});


app.get("/register", (req, res) => {
    res.render("register.ejs");
});

app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.get("/secrets", function(req, res) {
    if (req.isAuthenticated ()) {
        res.render("secrets.ejs");
    } else {
        res.redirect("/login");
    }
});

app.get("/logout", function(req, res) {
    req.logout((err) => {
        if (err) {
            console.log(err);
        }
        res.redirect('/');
    });
});

app.post("/register", (req, res) => {
    const username = req.body["username"];
    const password = req.body["password"];

    User.register({ username: username }, password, function(err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local") (req, res, function() {
                res.redirect("/secrets");
            })
        }
    });
});

app.post("/login", (req, res) => {
    const user = new User({
        username: req.body["username"],
        password: req.body["password"]
    });

    req.login(user, function(err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local") (req, res, function() {
                res.redirect("/secrets");
            })
        }
    })
});


app.listen(port, () => {
    console.log(`Server is running on the port ${port}`);
});