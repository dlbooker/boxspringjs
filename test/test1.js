require('../index');
var test = require('tape')
, boxspringjs = boxspring('regress')
, ddoc = function () {
	return {
		"updates": {
			"my-commit": function (doc, req) {
				doc['last-updated'] = Date();
				doc.size = JSON.stringify(doc).length;
				doc.junk = 'another-try';
				return [doc, JSON.stringify(doc) ];
			}
		},
		"views": {
			'my-view': {
				'map': function (doc) {
					if (doc && doc._id) {
						emit(doc._id, null);
					}
				}
			}
		}
	};
}
, anotherdb = boxspring('regress', {
	'id': 'anotherdb',
	'index': 'my-view',
	'designName': 'my-design',
	'maker': ddoc
})
, newdoc = boxspringjs.doc('sample-content').docinfo({'content': Date() })
, newdoc1 = boxspringjs.doc('write-file-test').docinfo({'content': Date() })
;

// Documentation: https://npmjs.org/package/tape
test('boxspringjs-1', function (t) {

	t.plan(18);
	boxspringjs.authorize(boxspring.auth, function() {

		boxspringjs.heartbeat(function(data) {
			t.equal(data.code, 200, 'heartbeat');
		});

		boxspringjs.session(function(data) {
			t.equal(data.code, 200, 'session');
		});

		boxspringjs.db_info(function(data) {
			t.equal(data.code, 200, 'db_info');
		});

		boxspringjs.all_dbs(function(data) {
			t.equal(data.code, 200, 'all_dbs');

			// gets root name by default, then tests getting name with id provided
		//	t.equal(anotherdb.name, boxspringjs.Id('anotherdb').name, 'anotherdb-name');
			t.equal(anotherdb.name, 'regress', 'regress-name');
			// tests the defaultView method since not defined
			t.equal(anotherdb.index, 'my-view', 'my-view');
			// not explicitly defined 'default'
			//console.log('anotherdb.index', anotherdb.index, 'boxspringjs.designName', boxspringjs.designName);
			t.equal(boxspringjs.designName, '_design/default', 'default');
			// makes sure we return a .doc object		
			t.equal(typeof boxspringjs.doc, 'function', 'function');

			// update saves an existing doc
			newdoc.update(function(result) {
				t.equal(result.code, 201, 'update');				
				newdoc.retrieve(function(result) {
					t.equal(result.code, 200, 'retrieve');
					newdoc.docinfo({ 'more-content': 'abcdefg'}).update(function(result) {
						t.equal(result.code, 201, 'more-content');
						newdoc.head(function(head) {
							t.equal(head.code, 200, 'head');
							newdoc.remove(function(result) {
								t.equal(result.code, 200, 'remove');
							});								
						});
					});
				});
			});

			boxspringjs.doc('docabc')
				.update({ 'extended-content': Date() }, function(response) {
					t.equal(response.code, 201, 'extended-content');
			});

			// save and expect to fail
			newdoc1.save(function(response) {
				t.equal(response.code, 409, 'save-fail');
				//console.log('save response:', newdoc1.docRev(), response.header.etag);
				// update should work
				newdoc1.update(function(update) {
					//console.log('update response', newdoc1.docRev(), update.header.etag, update.code);
					t.equal(update.code, 201, 'newdoc1 update');
					// get all docs using map views on the server (default)
					boxspringjs.design().get({ 'index': 'all_docs' }, function(couch) {
						t.equal(couch.code, 200, 'all_docs');

						// get all docs using map views FUTURE running in node
						boxspringjs.design()
							.get({ 'index': 'all_docs', 'server': 'node' }, function(node) {
							var found;
							_.each(node.data.rows, function(d) {
								var found;
								_.each(couch.data.rows, function(c) {
									found = (c.id === d.id && d.id);
								});
							});
							t.equal(typeof found, 'undefined', 'get-compared');
						});
					});
				});
			});
		});	
	});

});
