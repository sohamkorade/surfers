import * as THREE from 'three'

const world = {
	debug: '', // debug text
	controls: {
		up: false,
		down: false,
		left: false,
		right: false,
	},
	renderer: null,
	camera: null,
	follow_cam: null,
	orbit_cam: null,
	scene: null,
	

	tracks: [],
	trains: [],
	player: {
		HEIGHT: 0.5,
		mesh: null,
		track: null,
		velocity: new THREE.Vector3(0, 0, 0),
		switching_track: false,
		platform_height: 0,
		alive: true,
		ducking: false,
		jumping: false,
		ramping: false,
		speed: 0.1,
		mixer: null,
		animations: {
			run: null,
			jump: null,
			duck: null,
		},
	},
	models: {
		'subway': null,
	},
	textures: {
		'tracks': null,
		'barrier_jump': null,
		'barrier_jump_or_duck': null,
		'barrier_duck': null,
	}
}

const globals = {
	CHEATS: true,
	MAX_TRAINS: 10,
}

export { world, globals }