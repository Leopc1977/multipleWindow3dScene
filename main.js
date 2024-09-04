import WindowManager from './WindowManager.js'

const t = THREE;
let camera, scene, renderer, world;
let near, far;
let pixR = window.devicePixelRatio ? window.devicePixelRatio : 1;
let cubes = [];
let spheres = [];
let sceneOffsetTarget = {x: 0, y: 0};
let sceneOffset = {x: 0, y: 0};

let today = new Date();
today.setHours(0);
today.setMinutes(0);
today.setSeconds(0);
today.setMilliseconds(0);
today = today.getTime();

let internalTime = getTime();
let windowManager;
let initialized = false;

// get time in seconds since beginning of the day (so that all windows use the same time)
function getTime () { return (new Date().getTime() - today) / 1000.0; }


if (new URLSearchParams(window.location.search).get("clear")) {
	console.log("clear")
	localStorage.clear();
} else {	
	// this code is essential to circumvent that some browsers preload the content of some pages before you actually hit the url
	document.addEventListener("visibilitychange", () => 
	{
		if (document.visibilityState != 'hidden' && !initialized) {
			init();
		}
	});

	window.onload = () => {
		if (document.visibilityState != 'hidden') {
			init();
		}
	};

	function init ()
	{
		initialized = true;

		// add a short timeout because window.offsetX reports wrong values before a short period 
		setTimeout(() => {
			setupScene();
			setupWindowManager();
			resize();
			updateWindowShape(false);
			render();
			window.addEventListener('resize', resize);
		}, 500)	
	}

	function setupScene() {
		camera = new t.OrthographicCamera(0, 0, window.innerWidth, window.innerHeight, -10000, 10000);
		
		camera.position.z = 2.5;
		near = camera.position.z - .5;
		far = camera.position.z + 0.5;

		scene = new t.Scene();
		scene.background = new t.Color('grey');
		scene.add( camera );

		renderer = new t.WebGLRenderer({antialias: true, depthBuffer: true});
		renderer.setPixelRatio(pixR);
	    
	  	world = new t.Object3D();
		scene.add(world);

		renderer.domElement.setAttribute("id", "scene");
		document.body.appendChild( renderer.domElement );
	}

	function setupWindowManager() {
		windowManager = new WindowManager();
		windowManager.setWinShapeChangeCallback(updateWindowShape);
		windowManager.setWinChangeCallback(windowsUpdated);

		// here you can add your custom metadata to each windows instance
		let metaData = {foo: "bar"};

		// this will init the windowmanager and add this window to the centralised pool of windows
		windowManager.init(metaData);

		// call update windows initially (it will later be called by the win change callback)
		windowsUpdated();
	}

	function windowsUpdated () {
		updateNumberOfCubes();
	}

	/*
		Remove all cubes and add again but with upadted data
	*/
	function updateNumberOfCubes () {
		let wins = windowManager.getWindows();

		// remove all cubes
		cubes.forEach((c) => {
			world.remove(c);
		});
		spheres.forEach((s) => {
			world.remove(s);
		});
	
		cubes = [];
		spheres = [];

		// add new cubes based on the current window setup
		console.log(wins.length)
		for (let i = 0; i < wins.length; i++) {
			let win = wins[i];

			// Use a gradient of blues for the cubes
			let cubeColor = new t.Color(`hsl(${210 + i * 10}, 70%, 50%)`);

			// Use complementary warm colors for the spheres
			let sphereColor = new t.Color(`hsl(${30 + i * 10}, 80%, 60%)`);

			let s = 200 + i * 50;
			let cube = new t.Mesh(new t.BoxGeometry(s, s, s), new t.MeshBasicMaterial({color: cubeColor , wireframe: true}));
			let sphere = new t.Mesh(
				new t.SphereGeometry(s, s/5, s/5), 
				new t.MeshBasicMaterial({ color: sphereColor, wireframe: true })
			);

			sphere.position.x = win.shape.x + (win.shape.w * .5);
			sphere.position.y = win.shape.y + (win.shape.h * .5);

			cube.position.x = win.shape.x + (win.shape.w * .5);
			cube.position.y = win.shape.y + (win.shape.h * .5);

			world.add(sphere);
			spheres.push(sphere);
			world.add(cube);
			cubes.push(cube);
		}
	}

	function updateWindowShape(easing = true) {
		// storing the actual offset in a proxy that we update against in the render function
		sceneOffsetTarget = {x: -window.screenX, y: -window.screenY};
		if (!easing) sceneOffset = sceneOffsetTarget;
	}


	function render() {
		let t = getTime();
	
		windowManager.update();
	
		// Calculate the new position based on scene offset
		let falloff = .05;
		sceneOffset.x = sceneOffset.x + ((sceneOffsetTarget.x - sceneOffset.x) * falloff);
		sceneOffset.y = sceneOffset.y + ((sceneOffsetTarget.y - sceneOffset.y) * falloff);
	
		// Set the world position to the offset
		world.position.x = sceneOffset.x;
		world.position.y = sceneOffset.y;
	
		let wins = windowManager.getWindows();
	
		// Update cubes positions and rotations
		for (let i = 0; i < cubes.length; i++) {
			let cube = cubes[i];
			let win = wins[i];
			let _t = t;
	
			let posTarget = {x: win.shape.x + (win.shape.w * .5), y: win.shape.y + (win.shape.h * .5)};
	
			cube.position.x = cube.position.x + (posTarget.x - cube.position.x) * falloff;
			cube.position.y = cube.position.y + (posTarget.y - cube.position.y) * falloff;
			cube.rotation.x = _t * .5;
			cube.rotation.y = _t * .3;
		}
	
		// Update spheres positions and rotations
		for (let i = 0; i < spheres.length; i++) {
			let sphere = spheres[i];
			let win = wins[i];
			let posTarget = {x: win.shape.x + (win.shape.w * .5), y: win.shape.y + (win.shape.h * .5)};
			let _t = t;

			sphere.position.x = sphere.position.x + (posTarget.x - sphere.position.x) * falloff;
			sphere.position.y = sphere.position.y + (posTarget.y - sphere.position.y) * falloff;
	
			// Add rotation to spheres
			sphere.rotation.x = _t * .5;  // Rotate on the X axis
			sphere.rotation.y = _t * .3;  // Rotate on the Y axis
		}
	
		renderer.render(scene, camera);
		requestAnimationFrame(render);
	}

	// resize the renderer to fit the window size
	// At the end of the resize, not during the resize
	function resize() {
		let width = window.innerWidth;
		let height = window.innerHeight
		
		camera = new t.OrthographicCamera(0, width, 0, height, -10000, 10000);
		camera.updateProjectionMatrix();
		renderer.setSize( width, height );
	}
}