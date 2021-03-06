/* ===================================================
 * bulk.js v0.01
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
/*global _: true, bx: true */

(function(global) {
	"use strict";
	// Purpose: routines for bulk saving and removing
	var bulk = function (doclist, prohibit) {
		var owner = this 
		, that = this.doc('_bulk_docs')
		, lastResponse = [];
		
		that.url([ that.url(), '_bulk_docs'].join('/'));
		
		// extend the bulk object with the owner db object
		that.docs = { 'docs': doclist || [] };
		that.Max = undefined;
		
		// tells couchdb to commit the change before returning a response
		that.headers.set('X-Couch-Full-Commit', false);
		
		var checkSource = function (doc) {
			var attributes;
			
			// if doc is an object, then use post() to get the contents
			if (!prohibit) {
				if (_.isFunction(doc.get) && doc.get('_id')) {
					return _.omit(doc.post(), '_url');
				}				
			}
			// otherwise return the doc
			return doc;			
		} 

		// What it does: Returns and array to the caller with false at the index
		// of the doc if it succeeded, and the document information if it failed
		var status = function() {
			return _.map(lastResponse, function(doc) {
				return (doc && doc.error === 'conflict') ? doc : false;
			});
		};
		that.status = status;

		var save = function (handler) {
			var local = this;
			// updates is the design document containing update methods	
			if (_.isFunction(this.maker)) {
				var funcs = this.maker().updates || { 'dummy': function() {} };
				// iterate the update functions to run before posting
				_.each(this.docs.docs, function (doc) { 
					_.each(funcs, function (update_method) {
						try {
					//		update_method(doc);							
						} catch (e) {
							console.log(new Error('[bulk] update method failed.'));
						}
					});
				});				
			}

			// What this does: Sends the bulk data out in MAX slices;
			// does no checking for update conflicts. saving or removing docs without their _rev will fail
			(function (handler) {
				var doclist=_.clone(local.docs.docs)
					, Queue= local.UTIL.queue();

				// Create a Queue to hold the slices of our list of docs
				var doclistSlice = function (data) {
					local.exec({ docs: data }, function (err, response) {
						handler(err, response);	
						Queue.finish();
					});						
				};
				// submit to the queue until there are no more
				if (local.Max && (doclist.length > local.Max)) {		
					while (doclist.length > local.Max) {
						Queue.submit(doclistSlice, doclist.slice(0,local.Max));
						doclist = doclist.slice(local.Max);
					}
				}

				// Submit a final job of remaining docs
				Queue.submit(doclistSlice, doclist);
				Queue.run();
			}(handler));
			return this;
		};
		// we use the 'doc' object to do the actual save, so keep it in 'superiorSave'
		that.superiorSave = that.save;
		that.save = save;

		var remove = function (handler) {
			var local = this
			, doclist={ docs: [] }
			, buffer = []
			, eachDoc = function (headinfo) {
				if (headinfo.data !== 'error') {
					var path = _.fetch(headinfo, 'path', 'url', 'request');
					buffer = path.split('/');
					doclist.docs.push({ 
						'_id': buffer[buffer.length-1], 
						'_rev': local.getRev(headinfo) 
					});
					
					if (doclist.docs.length === local.docs.docs.length) {
						// do this when all the _revs have been found
						local.docs.docs = doclist.docs;
						local.docs.docs.forEach(function(nextDoc) {
							nextDoc._deleted = true;
						});
						local.exec(local.docs, function (err, response) {								
							handler(err, response);
						});								
					}							
				}
			};

			// use the HEAD method to quickly get the _revs for each document
			this.docs.docs.forEach(function(nextDoc) {
				owner.doc(nextDoc._id).head(function(err, headinfo) {
					if (err) {
						return handler(err, headinfo);
					}
					eachDoc(headinfo);
				});
			});
		};
		that.remove = remove;

		var exec = function (docsObj, callback) {
			
			// if the application set X-Couch-Full-Commit to true, set the batch=ok option
			if (this.headers.get('X-Couch-Full-Commit') === true) {
				this.options.set('batch', 'ok');				
			}
			
			this.source(docsObj)
				.superiorSave(function(err, response) {
					if (!err) {
						lastResponse = response && response.data;						
					}
					response.status = status;
					callback(err, response);				
			});
		};
		that.exec = exec;
		
		var max =  function (max) {
			this.Max=_.toInt(max);
			return this;
		};
		that.max = max;

		var push = function (item, handler) {
			if (item) {
				this.docs.docs.push(checkSource(item));
				if (handler && 
					_.isFunction(handler) && 
					this.docs.docs.length===this.Max) {
					this.save(handler);
					this.docs.docs = [];
				}
			}
			return this;
		};
		that.push = push;

		var getLength = function () {
			return this.docs.docs.length;
		};
		that.getLength = getLength;
		
		// check to see if doclist objects are 'doc' objects or source objects and convert if nec.
		that.docs.docs.forEach(function(doc, index) {
			that.docs.docs[index] = checkSource(doc);
		});
		return that;
	};
	global.bulk = bulk;
	
}(Boxspring));
