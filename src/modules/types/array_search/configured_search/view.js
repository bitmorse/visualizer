define(['modules/default/defaultview', 'src/util/datatraversing', 'src/util/api', 'lib/formcreator/formcreator', 'src/util/util'], function(Default, Traversing, API, FormCreator, Util) {
	
	function view() {};
	view.prototype = $.extend(true, {}, Default, {

		init: function() {	
			
			this.dom = $( '<div>' ).css( { } );
			this.module.getDomContent( ).html( this.dom );
			this.variables = {};
			this.cfgValue = {};
            this.maxhits = parseInt(this.module.getConfiguration( 'maxhits' ))||Number.POSITIVE_INFINITY;

			this._jpathsFcts = {};

			var self = this,
				searchfields = this.module.getConfiguration( 'searchfields' ),
				varsoutCfg = this.module.definition.vars_out || [],
				varsout = [],
				j = 0,
				k = varsoutCfg.length,
				cfg = {
					sections: {
						cfg: {
							groups: {
								cfg: {
									options: {
										type: 'list'
									},
									fields: FormCreator.makeStructure( searchfields, function( field ) {
										
										for( var k = 0, m = field.groups.general[ 0 ].searchOnField.length; k < m, field.groups.general[ 0 ].searchOnField[ k ] ; k ++) {
											Util.addjPathFunction(self._jpathsFcts, field.groups.general[ 0 ].searchOnField[ k ]);
										}
									} )
								}
							}
						}
					}
				};

			for( ; j < k ; j ++ ) {
				varsout.push( varsoutCfg[ j ].name );
			}
			
			
			var form = FormCreator.makeForm();

			form.init( {
				onValueChanged: function( value ) {
					var cfg = form.getValue().sections.cfg[ 0 ].groups.cfg[ 0 ],
						cfgFinal = {};

					for( var i in cfg ) {
						cfgFinal[ i ] = cfg[ i ][ 0 ];
					}

					$.extend( self.cfgValue, cfgFinal );
					self.search();
				}
			} );

			form.setStructure( cfg );
			form.onStructureLoaded().done(function() {
				form.fill({ });
			});

			form.onLoaded( ).done( function( ) {
				self.dom.html( form.makeDom( 2 ) );
				form.inDom();
                                form.fieldElementValueChanged();
			});
			
			this.makeSearchFilter();
		},

		blank: {
			value: function(varName) {
				this.dom.empty();
			}
		},
		
		inDom: function() { 
		},

		search: function() {


			var self = this,
				cfg = this.cfgValue,
				val = this.module.getDataFromRel( 'array' ),
				i = 0,
				l,
				target = new DataArray();

			if( ! val || Object.keys(cfg).length===0 ) {
				return;
			}

			val = val.get();
            
			l = Math.min(val.length, this.maxhits);

			for( ; i < l ; i ++ ) {
				if( this.searchElement( cfg, val[ i ].get() ) ) {
					target.push( val[ i ] );
				}
			}

			this.module.controller.searchDone( target );		
		},

		_makeOp: function( op, val, options ) {

			val = "cfg[ '" + val + "' ]";
                        var numPrefix = "", numSuffix = "";
                        if(options.number) {
                            numPrefix = "parseFloat(";
                            numSuffix = ")";
                        }
                        var textSuffix = ".toLowerCase()";
                        if(options.caseSensitive) {
                            textSuffix = "";
                     }
			switch( op ) {

				case '=':
				case 'eq':
                                    if(options.number) {
                                        return " el == " + numPrefix + val + numSuffix + " ";
                                    } else {
                                        return " ((el+'')"+textSuffix+") == " + val + textSuffix + " ";
                                    }
				break;

				case '<>':
				case '><':
				case '!=':
					return " (el + '') !== " + val + " ";
				break;

				case '>':
					return " el > " + numPrefix + val + numSuffix + " ";
				break;

				case '>=':
					return " el >= " + numPrefix + val + numSuffix + " ";
				break;

				case '<':
					return " el <  " + numPrefix + val + numSuffix + "  ";
				break;

				case '<=':
					return " el <=  " + numPrefix + val + numSuffix + "  ";
				break;

				case 'contains':
					return " el"+textSuffix+".match(" + val + textSuffix + ") ";
				break;

				case 'notcontain':
					return " ! el"+textSuffix+".match(" + val + textSuffix + ") ";
				break;

				case 'starts':
					return " el"+textSuffix+".match(new RegExp('^'+" + val + textSuffix + ")) ";
				break;

				case 'end':
					return " el"+ textSuffix +".match(new RegExp(" + val + textSuffix + "+'$')) ";
				break;

				case 'btw':
					//if( val instanceof Array ) {
						return " ( el >= parseFloat( " + val + "[0] ) && el <= parseFloat( " + val + "[1] ) )";
					//}
				break;
			}

		},

		makeSearchFilter: function() {

			
			var self = this,
				searchfields = this.module.getConfiguration( 'searchfields' ),
				i = 0,
				l = searchfields.length,
				searchOn;


			var toEval = "";
			toEval += " this._searchFunc = function( cfg, row ) { ";
			
			toEval += " var el; "


			toEval += " return "
			for( ; i < l ; i ++ ) {

				searchOn = searchfields[ i ].groups.general[ 0 ].searchOnField || [];

				if( i > 0 ) {
					toEval += " && ";
				}

				var j = 0,
				k = searchOn.length;

				/////////
				var add = "";
				if( k > 0 ) {
					toEval += " ( ";

					for( ; j < k ; j ++ ) {

						if( j > 0 ) {
							toEval += " || ";
						}
                                                var opts = {};
                                                if(searchfields[ i ].groups.general[ 0 ].type[ 0 ]==='float') opts.number=true;
                                                if(searchfields[ i ].groups.text && searchfields[ i ].groups.text[ 0 ].case_sensitive[ 0 ][ 0 ]==='case_sensitive') opts.caseSensitive=true;
						toEval += " ( ( el = self.getJpath( '" + searchOn[ j ] + "', row ) ) && ( ";
						toEval += this._makeOp( searchfields[ i ].groups.general[ 0 ].operator[ 0 ], searchfields[ i ].groups.general[ 0 ].name[ 0 ], opts );
						toEval += " ) ) ";

					}
					toEval += " ) ";
				}
				/////////
			}

			toEval += "; ";
			//toEval += add;
			//toEval += " return a; ";
			toEval += "};";

			try {
				eval( toEval );
			} catch( e ) {
				console.error("Error while evaluating function.")
				console.log( toEval );
			}
		},

		searchElement: function( cfg, row ) {
			return this._searchFunc( cfg, row );
		},

		getJpath: function( jpathEl, row ) {
			return this._jpathsFcts[ jpathEl ]( row );
		},

		update: {
			
			array: function( variableValue, variableName ) {
				
				//variableValue = Traversing.get( variableValue );
				//this.variables[ variableName ] = variableValue;
				this.search( );
			}
		},
				
		typeToScreen: {}
	});

	return view;
});