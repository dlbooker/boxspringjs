/* ===================================================
 * access.js v0.01
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
/*global _: true, Boxspring: true */

(function(global) {
	"use strict";

	// formats a cell value based on type information
	var cell = function (ownerTypes, formats) {
		var validTypes = ['string','number','boolean','date','datetime','timeofday','object','array']
		, that = {};
		
		that.builtInColumns = this.UTIL.hash({
			'year': ['number',1],
			'month': ['number',1],
			'country': ['string',2],
			'city': ['string',2],
			'state': ['string',2],
			'address': ['string',4],
			'count': ['number',1],
			'sum': ['number',1],
			'average': ['number',1],
			'keyword': ['string',1],
			'index': ['number',1],
			'values': ['object',2],
			'row total': ['number',1],
			'column total': ['number',1],
			'view': ['string', 1],
			'summary': ['object', 8] 
		});

		// if there is a format function for cells, then the caller passes it in from the design;
		that.formats = formats;
		
		var thisType = function (key) {
			return _.isArray(key) ? key[0] : 'string';
		};
		that.thisType = thisType;

		var thisWidth = function (key) {
			return _.isArray(key) && key.length > 1 ? key[1] : 2;
		};
		that.thisWidth = thisWidth;

		var hasType = function (key) {
			return this.builtInColumns.contains(key) ? true : false;
		};
		that.hasType = hasType;

		var getType = function (key) {
			return(this.thisType(this.builtInColumns.get(key)));
		};
		that.getType = getType;

		var columnWidth = function (key) {
			return (this.builtInColumns.contains(key) && thisWidth(this.builtInColumns.lookup(key))) || 1;			
		};
		that.columnWidth = columnWidth;
		
		// What it does: accepts name/type or object of names/types. Extends the types hash
		// by adding columnTypes to an object with optional width.		
		/*global log: true */
		var columnTypes = function (name, type, width) {
			var buffer = {}
			, local = this;

			// 'name' can be an individual name/type pair, or an object containing a set of name/types
			// if 'type' is not provided, then default to whatever type the 'name' is
			if (typeof name === 'string') {
				buffer[name] = [type || 'string', width || 2];
			} else if (typeof name === 'number') {
				buffer[name] = [type || 'number', width || 1];
			} else if (typeof name === 'object') {
				buffer = name;
			}

			// loop each element in the buffer, and update the builtInTypes hash
			_.each(buffer, function(item, key) {
				if (_.found(validTypes, local.thisType(item))) {
					local.builtInColumns.store(key, item);
				} else {
					throw new Error('[ cell.columnTypes ] - invalid type: ' + item);
				}
			});
			return this;	
		};
		that.columnTypes = columnTypes;
		// extend the builtInTypes hash with types passsed in by the owner
		that.columnTypes(ownerTypes);

		// What it does: Returns a 'cell' object with filled in missing pieces; Accepts either an object
		// or name, value, type arguments
		var newCell = function(name, value, type) {
			var formats = (this.formats && _.isFunction(this.formats)) 
				? this.formats 
				: function() { return {}; }
			, o = typeof name === 'object' ? name : {'name': name, 'value': value, 'type': type }
			, cell = {
				'name': o.name,
				'value': o.value,
				'type': this.getType(o.name),
				'format': o.format,
				'properties': o.properties
			};
			// if there is a formatter function, then call it and return
			if (formats && formats()[cell.name] && cell.value) {
				cell.type = 'string';
				if (_.isString(cell.value)) {
					cell.format = this.formats()[cell.name](cell.value).toString();
				} else {
					cell.format = this.formats()[cell.name](cell.value).toString();					
					cell.value = _.map(cell.value, _.item).join(',');
				}
				return cell;
			}
			// generic formatter then
			if (cell.type === 'array') {
				cell.value = _.map(cell.value, _.item).join(',');				
				cell.type = 'string';
				return cell;					
			}
			if (cell.type === 'object'){
				cell.value = (cell && cell.value && JSON.stringify(cell.value)) || '';
				cell.type = 'string';
				return cell;
			}
			// otherwise, coerce this value to its type, if you can and return;
			cell.value = _.coerce(cell.type, cell.value);
			return cell;
		};
		that.newCell = newCell;
		that.newColumn = newCell;
		return that;
	};
	global.cell = cell;

}(Boxspring));
