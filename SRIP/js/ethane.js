var camera, scene, renderer;
			var controls;
			var root;
			var objects = [];
			var tmpVec1 = new THREE.Vector3();
			var tmpVec2 = new THREE.Vector3();
			var tmpVec3 = new THREE.Vector3();
			var tmpVec4 = new THREE.Vector3();
			var offset = new THREE.Vector3();
			var visualizationType = 2;
			var MOLECULES = {
				"Ethane": "eth.pdb",
			};
			var loader = new THREE.PDBLoader();
			var colorSpriteMap = {};
			var baseSprite = document.createElement( 'img' );
			var menu = document.getElementById( "menu" );
			init();
			animate();
			function init() {
				camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 5000 );
				camera.position.z = 1500;
				scene = new THREE.Scene();
				root = new THREE.Object3D();
				scene.add( root );
				//
				renderer = new THREE.CSS3DRenderer();
				renderer.setSize( window.innerWidth, window.innerHeight );
				document.getElementById( 'container' ).appendChild( renderer.domElement );
				//
				controls = new THREE.TrackballControls( camera, renderer.domElement );
				controls.rotateSpeed = 0.5;
				controls.addEventListener( 'change', render );
				//
				baseSprite.onload = function () {
					loadMolecule( "../Libraries/eth.pdb" );
					showAtomsBonds();
				};
				baseSprite.src = '../Libraries/ball.png';
				//
				window.addEventListener( 'resize', onWindowResize, false );
			}
			//
			function generateButtonCallback( url ) {
				return function () {
					loadMolecule( url );
				};
			}
			
			function showAtomsBonds() {
				for ( var i = 0; i < objects.length; i ++ ) {
					var object = objects[ i ];
					object.element.style.display = "";
					object.visible = true;
					if ( ! ( object instanceof THREE.CSS3DSprite ) ) {
						object.element.style.height = object.userData.bondLengthShort;
					}
				}
			}
			//
			function colorify( ctx, width, height, color ) {
				var r = color.r, g = color.g, b = color.b;
				var imageData = ctx.getImageData( 0, 0, width, height );
				var data = imageData.data;
				for ( var i = 0, l = data.length; i < l; i += 4 ) {
					data[ i + 0 ] *= r;
					data[ i + 1 ] *= g;
					data[ i + 2 ] *= b;
				}
				ctx.putImageData( imageData, 0, 0 );
			}
			function imageToCanvas( image ) {
				var width = image.width;
				var height = image.height;
				var canvas = document.createElement( 'canvas' );
				canvas.width = width;
				canvas.height = height;
				var context = canvas.getContext( '2d' );
				context.drawImage( image, 0, 0, width, height );
				return canvas;
			}
			//
			function loadMolecule( url ) {
				for ( var i = 0; i < objects.length; i ++ ) {
					var object = objects[ i ];
					object.parent.remove( object );
				}
				objects = [];
				loader.load( url, function ( pdb ) {
					var geometryAtoms = pdb.geometryAtoms;
					var geometryBonds = pdb.geometryBonds;
					var json = pdb.json;
					geometryAtoms.computeBoundingBox();
					geometryAtoms.boundingBox.getCenter( offset ).negate();
					geometryAtoms.translate( offset.x, offset.y, offset.z );
					geometryBonds.translate( offset.x, offset.y, offset.z );
					var positions = geometryAtoms.getAttribute( 'position' );
					var colors = geometryAtoms.getAttribute( 'color' );
					var position = new THREE.Vector3();
					var color = new THREE.Color();
					for ( var i = 0; i < positions.count; i ++ ) {
						position.x = positions.getX( i );
						position.y = positions.getY( i );
						position.z = positions.getZ( i );
						color.r = colors.getX( i );
						color.g = colors.getY( i );
						color.b = colors.getZ( i );
						var atom = json.atoms[ i ];
						var element = atom[ 4 ];
						if ( ! colorSpriteMap[ element ] ) {
							var canvas = imageToCanvas( baseSprite );
							var context = canvas.getContext( '2d' );
							colorify( context, canvas.width, canvas.height, color );
							var dataUrl = canvas.toDataURL();
							colorSpriteMap[ element ] = dataUrl;
						}
						var colorSprite = colorSpriteMap[ element ];
						var atom = document.createElement( 'img' );
						atom.src = colorSprite;
						var object = new THREE.CSS3DSprite( atom );
						object.position.copy( position );
						object.position.multiplyScalar( 75 );
						object.matrixAutoUpdate = false;
						object.updateMatrix();
						root.add( object );
						objects.push( object );
					}
					positions = geometryBonds.getAttribute( 'position' );
					var start = new THREE.Vector3();
					var end = new THREE.Vector3();
					for ( var i = 0; i < positions.count; i += 2 ) {
						start.x = positions.getX( i );
						start.y = positions.getY( i );
						start.z = positions.getZ( i );
						end.x = positions.getX( i + 1 );
						end.y = positions.getY( i + 1 );
						end.z = positions.getZ( i + 1 );
						start.multiplyScalar( 75 );
						end.multiplyScalar( 75 );
						tmpVec1.subVectors( end, start );
						var bondLength = tmpVec1.length() - 50;
						//
						var bond = document.createElement( 'div' );
						bond.className = "bond";
						bond.style.height = bondLength + "px";
						var object = new THREE.CSS3DObject( bond );
						object.position.copy( start );
						object.position.lerp( end, 0.5 );
						object.userData.bondLengthShort = bondLength + "px";
						object.userData.bondLengthFull = ( bondLength + 55 ) + "px";
						//
						var axis = tmpVec2.set( 0, 1, 0 ).cross( tmpVec1 );
						var radians = Math.acos( tmpVec3.set( 0, 1, 0 ).dot( tmpVec4.copy( tmpVec1 ).normalize() ) );
						var objMatrix = new THREE.Matrix4().makeRotationAxis( axis.normalize(), radians );
						object.matrix = objMatrix;
						object.rotation.setFromRotationMatrix( object.matrix, object.rotation.order );
						object.matrixAutoUpdate = false;
						object.updateMatrix();
						root.add( object );
						objects.push( object );
						//
						var bond = document.createElement( 'div' );
						bond.className = "bond";
						bond.style.height = bondLength + "px";
						var joint = new THREE.Object3D( bond );
						joint.position.copy( start );
						joint.position.lerp( end, 0.5 );
						joint.matrix.copy( objMatrix );
						joint.rotation.setFromRotationMatrix( joint.matrix, joint.rotation.order );
						joint.matrixAutoUpdate = false;
						joint.updateMatrix();
						var object = new THREE.CSS3DObject( bond );
						object.rotation.y = Math.PI / 2;
						object.matrixAutoUpdate = false;
						object.updateMatrix();
						object.userData.bondLengthShort = bondLength + "px";
						object.userData.bondLengthFull = ( bondLength + 55 ) + "px";
						object.userData.joint = joint;
						joint.add( object );
						root.add( joint );
						objects.push( object );
					}
					//console.log( "CSS3DObjects:", objects.length );
			
					render();
				} );
			}
			//
			function onWindowResize() {
				camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();
				renderer.setSize( window.innerWidth, window.innerHeight );
				render();
            }
            
			function animate() {
				requestAnimationFrame( animate );
				controls.update();
				var time = Date.now() * 0.0004;
				//root.rotation.x = time;
				//root.rotation.y = time * 0.7;
				render();
            }
			function render() {
				renderer.render( scene, camera );
			}