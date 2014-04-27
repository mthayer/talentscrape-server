/**
 * Module dependencies.
 */

var argo = require('argo');
var express = require('express');
var cheerio = require('cheerio');
var request = require('request');
var _ = require('underscore');
var Twit = require('twit');
var usergrid = require('usergrid');
var express = require('express');
var request = require('request');

var app = express();

// Initialize Usergrid
client = new usergrid.client({
    orgName:'mthayer',
    appName:'talent-pool',
    authType:usergrid.AUTH_CLIENT_ID,
    clientId:'YXA6Y05H8LqtEeOdeGH6me8EBw',
    clientSecret:'YXA6LLfLi4fq7fKb_4wz-aYhFy0w9Vw',
    logging: true, //optional - turn on logging, off by default
    buildCurl: false //optional - turn on curl commands, off by default
});

console.log('Server started');

var proxy = argo()
    .use(function(handle) {
        handle('response', function(env, next) {
            env.response.setHeader('Access-Control-Allow-Origin', '*');
            next(env);
        });
    })
    .use(function(handle) {
        handle('response', function(env, next) {
            if (env.request.method === 'OPTIONS') {
                env.response.statusCode = 200;
                env.response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
                env.response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
                env.response.setHeader('Access-Control-Max-Age', '432000'); // 12 hours in seconds
            }
            next(env);
        });
    })
     .route('^/.+/apm/.*$', {
        methods: ['GET', 'POST']
    }, function(handle) {
        handle('request', function(env, next) {
            env.target.url = 'https://api.usergrid.com' + env.request.url;
            next(env);
        });
    })
    .post('/mthayer/talent-pool/candidates/*', function(handle) {
        handle('request', function(env, next) {
        var org = env.request.url.split('/');
    
        env.request.getBody(function(err, body) {
            if (err) {
                console.log('Error: ' + err);
            } else {
                var b = JSON.parse(body.toString());
            var twitterInfo = {};
            var entity = {
                type: "candidates",
                "name" : b.name,
                "fullName" : b.fullName,
                "currentTime" : b.currentTime,
                "headline" : b.headline,
                "email" : b.email,
                "image" : b.image,
                "phone" : b.phone,
                "experience" : b.experience,
                // "twitter" : (twitterInfo ? twitterInfo : "none" )
            }
                if(b.twitter != "none"){
                    request.get('https://twitter.com/'+b.twitter, function(err, request, body) {
                        if (err) return next(err);
                        console.log("getting stuff");
                        var $ = cheerio.load(body);
                        twitterInfo.twitFullName = $('.profile-card-inner .fullname').text().trim();
                        twitterInfo.twitScreenName = $('.screen-name').text().trim();
                        twitterInfo.twitBio = $('.profile-card-inner .bio').text().trim();
                        twitterInfo.twitLocation = $('.profile-card-inner .location').text().trim();
                        twitterInfo.twitOtherTwitter = $('.profile-card-inner .tweet-url').text().trim();
                        twitterInfo.twitWebsite = $('.profile-card-inner .url a').attr('href');
                        twitterInfo.twitImage = $('.size73').attr('src');
                        twitterInfo.twitText = $('.tweet-text').first().text();
                        console.log(twitterInfo); 
                        entity.twitter = twitterInfo;
                    });    
                }

                    client.createEntity(entity, function(err, res) {
                    if (err) {
                        console.log('entity creation went boom');
                    } else {
                        console.log('created entity');
                        if (b.appUser) {
                            var appUser = client.restoreEntity(b.appUser);
                            appUser.connect("viewed", res, function(error, data) {
                                if (error) {
                                    console.log("An error occured while connecting the entity");
                                    next(env);
                                } else {
                                    console.log('Entity connected');
                                    env.response.body = data;
                                    next(env);
                                }
                            });
                        } else {
                            next(env);
                        }

                    }
                });

                } //end else
            }); //end
        });
    })
    .build();

function SendEntity() {
                    client.createEntity(entity, function(err, res) {
                    if (err) {
                        console.log('entity creation went boom');
                    } else {
                        console.log('created entity');
                        if (b.appUser) {
                            var appUser = client.restoreEntity(b.appUser);
                            appUser.connect("viewed", res, function(error, data) {
                                if (error) {
                                    console.log("An error occured while connecting the entity");
                                    next(env);
                                } else {
                                    console.log('Entity connected');
                                    env.response.body = data;
                                    next(env);
                                }
                            });
                        } else {
                            next(env);
                        }

                    }
                });
                }

app.use("/", express.static(__dirname));

app.all('*', proxy.run);

app.listen(3000, function () {
    console.log("Server starting...");
});

