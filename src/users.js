/* ===================================================
 * db.js v0.01
 * https://github.com/rranauro/boxspringjs
 * ===================================================
 * Copyright 2013 Incite Advisors, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

/*jslint newcap: false, node: true, vars: true, white: true, nomen: true  */
/*global _: true, Boxspring: true, Backbone: true */
"use strict";

if (typeof boxspring === 'undefined') {
	var boxspring = function () {};	
}

var thisauth = require('auth').auth;

(function(global) {
	
	var users = function (name, admin) {
		var that = _.extend({}, this)
		, adminDb = Boxspring.extend('_users', {'auth': admin })(this.url);
			
		// used by userSignUp and userDelete
		var authFileUserDocName = function() {
			return 'org.couchdb.user:'+name;
		};

		var get = function (handler) {
			var doc = adminDb
				.doc(authFileUserDocName()).retrieve(function(err, response) {
				handler(err, response, doc);
			});
		};
		that.get = get;
				
		var signUp = function(password, roles, handler) {
			var anonymous = Boxspring.extend('_users')(this.url)
			, newUser = Boxspring.extend(this.name, {
				'auth': {'name': name, 'password': password }})(this.url);
						
			// create a document and add it to the _users database
			anonymous.doc(authFileUserDocName()).source({
				'type': 'user',
				'name': name,
				'password': password,
				'roles': roles
			}).save(function(err, r2) {					
				if (err) {
					// something is wrong, return an error
					return handler(err, r2);
				}
				// log in this new user and provide a new database handle in the callback
				newUser.login(function(err, response) {
					if (err || response.code === 401) {
						return handler(err, response);
					}
					handler(null, response, newUser);
				});
			});				
		};
		that.signUp = signUp;
		
		var remove = function (handler) {
			Boxspring.extend('_users', {'auth': thisauth.auth })()
				.doc(authFileUserDocName())
				.remove(function(err, response) {
					if (err || response.code === 401) {
						if (response.code === 401) {
							return handler(new Error('User name document not found.'), response);
						}
					}
					// if its not 401, let the caller handle the error
					return handler(err, response);				
				});
		};
		that.remove = remove;
		
		var update = function(newPassword, newRoles, handler) {
			var local = this
			
			this.remove(function(err, response) {
				if (err) {
					return handler(err, response);
				}
				local.signUp(newPassword, newRoles, handler);
			});
		};
		that.update = update;
		return that;
	};
	
	global.users = users;
})(boxspring);