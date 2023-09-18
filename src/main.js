import * as THREE from 'three'
import { OrbitControls } from 'OrbitControls'
import { FBXLoader } from 'three/addons/loaders/FBXLoader'
import { MTLLoader } from 'three/addons/loaders/MTLLoader'
import { OBJLoader } from 'three/addons/loaders/OBJLoader'

const CHEATS = true
const MAX_TRAINS = 2
const PLAYER_HEIGHT = 0.5

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

camera.position.y = 2
camera.position.z = 3

// orbit control
const controls = new OrbitControls(camera, renderer.domElement)
controls.update()

const clock = new THREE.Clock()

const tracks = []
const trains = []

const player = {
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
}

const models = {
	'subway': null,
}

const textures = {
	'tracks': null,
	'barrier_jump': null,
	'barrier_jump_or_duck': null,
	'barrier_duck': null,
}

function load_textures() {
	textures['tracks'] = new THREE.TextureLoader().load('../tracks.png')
	textures['barrier_jump'] = new THREE.TextureLoader().load('../barrier_jump.jpg')
	textures['barrier_jump_or_duck'] = new THREE.TextureLoader().load('../barrier_jump_or_duck.jpg')
	textures['barrier_duck'] = new THREE.TextureLoader().load('../barrier_duck.jpg')
}

function gen_tracks() {
	const track_geometry = new THREE.BoxGeometry(1, 0.1, 100)
	const track_material = new THREE.MeshBasicMaterial({ color: 'gray' })

	// add texture
	track_material.map = textures['tracks']
	track_material.map.wrapS = THREE.RepeatWrapping
	track_material.map.wrapT = THREE.RepeatWrapping
	track_material.map.repeat.set(1, 15)
	// set chroma key
	track_material.alphaMap = textures['tracks']
	track_material.alphaMap.wrapS = THREE.RepeatWrapping
	track_material.alphaMap.wrapT = THREE.RepeatWrapping
	track_material.alphaMap.repeat.set(1, 15)
	track_material.transparent = true
	track_material.alphaTest = 0.5

	const max_tracks = 3
	const track_width = 1.2

	for (let i = 0; i < max_tracks; i++) {
		const track = new THREE.Mesh(track_geometry, track_material)
		scene.add(track)
		const mid = Math.floor(max_tracks / 2)
		track.position.x = (i - mid) * track_width
		track.position.y = -track.geometry.parameters.height / 2
		track.position.z = -40
		tracks.push(track)
	}
}



function gen_train() {
	const train_length = 10 + Math.random() * 10

	const barriers = {
		'barrier_jump': {
			mesh: new THREE.Mesh(
				new THREE.BoxGeometry(1, PLAYER_HEIGHT * 2, 0.2),
				new THREE.MeshBasicMaterial({ color: 'orange' }),
			),
			position: new THREE.Vector3(0, PLAYER_HEIGHT, 0),
		},
		'barrier_jump_or_duck': {
			mesh: new THREE.Mesh(
				new THREE.BoxGeometry(1, PLAYER_HEIGHT * 2, 0.2),
				new THREE.MeshBasicMaterial({ color: 'yellow' }),
			),
			position: new THREE.Vector3(0, PLAYER_HEIGHT, 0),
		},
		'barrier_duck': {
			mesh: new THREE.Mesh(
				new THREE.BoxGeometry(1, PLAYER_HEIGHT * 3, 0.2),
				new THREE.MeshBasicMaterial({ color: 'pink' }),
			),
			position: new THREE.Vector3(0, PLAYER_HEIGHT * 1.5, 0),
		},
		'train': {
			mesh: new THREE.Mesh(
				new THREE.BoxGeometry(1, PLAYER_HEIGHT * 3, train_length),
				new THREE.MeshBasicMaterial({ color: 'brown' }),
			),
			position: new THREE.Vector3(0, PLAYER_HEIGHT * 1.5, 0),
		},
	}

	const prob = {
		'barrier_jump': 0.2,
		'barrier_jump_or_duck': 0.2,
		'barrier_duck': 0.2,
		'train': 0.4,
	}

	let prob_sum = 0
	let barrier_type = 'train'
	const rand = Math.random()
	for (let key in prob) {
		prob_sum += prob[key]
		if (prob_sum > rand) {
			barrier_type = key
			break
		}
	}

	let barrier
	// barrier_type = 'train'
	if (barrier_type == 'train' && models['subway']) {
		// barrier = models['subway'].clone()
		// barrier.geometry = barriers[barrier_type].mesh.geometry.clone()
		barrier = barriers[barrier_type].mesh.clone()
		const subway = models['subway'].clone()
		barrier.add(subway)
		// stretch train
		const scale = train_length / subway.userData.orig_length
		subway.scale.z = scale
		subway.position.y = -0.9
		// hide train box
		barrier.material.visible = false
	} else {
		barrier = barriers[barrier_type].mesh.clone()
		barrier.material.map = textures[barrier_type]
		barrier.material.alphaTest = 0.5
		barrier.material.transparent = true
	}


	scene.add(barrier)
	trains.push(barrier)

	// // make transparent
	// barrier.material.transparent = true
	// barrier.material.opacity = 0.8

	barrier.position.copy(barriers[barrier_type].position)
	barrier.position.z = -30 + Math.random() * -10

	// put it on a random track
	const track_id = Math.floor(Math.random() * tracks.length)
	const track = tracks[track_id]
	barrier.position.x = track.position.x
	barrier.userData.track_id = track_id
	barrier.userData.speed = 0
	barrier.userData.barrier_type = barrier_type

	// add ramp
	const train_has_ramp = Math.random() > 0.5
	if (barrier_type == 'train') {
		if (train_has_ramp) {
			const ramp = new THREE.Mesh(
				new THREE.BoxGeometry(1, 0.1, 2),
				new THREE.MeshBasicMaterial({ color: 'green' }),
			)
			ramp.name = 'ramp'
			// shift it to the front
			ramp.position.z += train_length / 2 + ramp.geometry.parameters.depth / 3

			// rotate
			ramp.rotation.x = Math.PI / 4

			barrier.add(ramp)
		} else {
			// train is running if it doesn't have a ramp
			barrier.userData.speed = 0.1
		}
		barrier.userData.train_height = barrier.geometry.parameters.height
		barrier.userData.train_top = barrier.position.y + barrier.userData.train_height / 2
		barrier.userData.train_front = barrier.position.z + barrier.geometry.parameters.depth / 2
		barrier.userData.train_back = barrier.position.z - barrier.geometry.parameters.depth / 2
	}
}


function update_trains() {
	if (trains.length < MAX_TRAINS) {
		gen_train()
	}

	player.platform_height = 0
	const player_bottom = player.mesh.position.y - player.meshbox.geometry.parameters.height / 2
	const player_front = player.mesh.position.z + player.meshbox.geometry.parameters.depth / 2

	// set color to blue
	player.meshbox.material.color.set('blue')

	for (let i = 0; i < trains.length; i++) {
		const train = trains[i]

		// if goes out of screen, remove it
		if (train.position.z > 10) {
			scene.remove(train)
			trains.splice(i, 1)
			continue
		}

		// move forward
		if (player.alive) {
			train.position.z += player.speed + train.userData.speed
		}

		// check if it hits the player
		const train_top = train.position.y + train.geometry.parameters.height / 2
		const train_front = train.position.z + train.geometry.parameters.depth / 2
		const train_back = train.position.z - train.geometry.parameters.depth / 2

		// player.meshbox.rotation.x *= 0.9

		// // duck camera under the barrier
		// if (train.userData.track_id == player.track_id) {
		// 	if (train.userData.barrier_type == 'barrier_duck' || train.userData.barrier_type == 'barrier_jump_or_duck') {
		// 		if (train_back >= player_front && train_back <= player_front + 3) {
		// 			camera.position.y += (player.platform_height - camera.position.y) * 0.5
		// 		}
		// 	}
		// }

		if (train.userData.barrier_type == 'train') {
			// smoothly elevate the player on ramp

			const ramp = train.getObjectByName('ramp')
			if (ramp) {
				// ramp collision
				if (new THREE.Box3().setFromObject(player.mesh).expandByScalar(2).intersectsBox(new THREE.Box3().setFromObject(ramp))) {
					player.ramping = true

					// get intersection point of ramp's top and player's bottom
					const raycaster = new THREE.Raycaster(
						new THREE.Vector3(player.mesh.position.x, player_bottom, player_front),
						new THREE.Vector3(0, 1, 0),
					)
					const intersects = raycaster.intersectObject(ramp)
					if (intersects.length > 0) {
						const intersection = intersects[0].point
						player.mesh.position.y = intersection.y + 1 + player.meshbox.geometry.parameters.height / 2

						// // rotate player
						// player.meshbox.rotation.x = Math.PI / 4
						player.platform_height = intersection.y + 1
					}
				}
			}



			// if player is on top of the train
			if (Math.abs(player.mesh.position.x - train.position.x) < 1
				&& player_bottom >= train_top
				&& train_front >= player_front
				&& train_back <= player_front
			) {
				player.meshbox.material.color.set('green')
				player.platform_height = train_top
				player.ramping = false
			}
		}
		if (!player.ramping) {
			// box collision
			if (new THREE.Box3().setFromObject(player.mesh).intersectsBox(new THREE.Box3().setFromObject(train))) {
				if (!CHEATS) {
					player.alive = false
				}
				player.meshbox.material.color.set('red')
			}
		}
	}
	// console.log(player.platform_height, player.mesh.position.y)
}

function add_player() {
	player.mesh = new THREE.Group()
	player.meshbox = new THREE.Mesh(
		new THREE.BoxGeometry(PLAYER_HEIGHT, PLAYER_HEIGHT, PLAYER_HEIGHT),
		new THREE.MeshBasicMaterial({ color: 'blue' }),
	)

	player.mesh.add(player.meshbox)

	// box helper
	// window.boxhelper = new THREE.BoxHelper(player.meshbox, 0xffff00)
	// scene.add(boxhelper)

	// hide the box
	// player.meshbox.material.visible = false
	player.meshbox.material.transparent = true
	player.meshbox.material.opacity = 0.2

	player.mesh.position.y = 5

	scene.add(player.mesh)

	// put on middle track
	player.track_id = Math.floor(tracks.length / 2)
	const track = tracks[player.track_id]
	player.mesh.position.x = track.position.x
}

function switch_track(offset) {
	if (!player.alive) return

	const track = tracks[player.track_id]

	const new_track = tracks[player.track_id + offset]
	// check if there is a track on the offset
	if (!new_track) return

	const player_front = player.mesh.position.z + player.meshbox.geometry.parameters.depth / 2

	// check if there is a train on the new track in case player is on ground
	if (is_on_ground(player.mesh, player.meshbox.geometry.parameters.height, player.platform_height)) {
		for (let i = 0; i < trains.length; i++) {
			const train = trains[i]
			if (train.userData.barrier_type != 'train') continue
			if (train.userData.track_id == player.track_id + offset) {
				const train_front = train.position.z + train.geometry.parameters.depth / 2
				const train_back = train.position.z - train.geometry.parameters.depth / 2
				if (train_front > player_front && train_back < player_front) {
					return
				}
			}
		}
	}

	player.track_id += offset
	player.velocity.x = (new_track.position.x - track.position.x) * 5
	player.switching_track = true
}

function update_player() {
	const delta = clock.getDelta()

	// update position
	player.mesh.position.x += player.velocity.x * delta
	player.mesh.position.y += player.velocity.y * delta
	// player.mesh.position.z += player.velocity.z * delta

	// gravity
	player.velocity.y -= 0.1

	// ducking
	if (player.ducking) {
		// shrink
		player.meshbox.scale.y -= 0.04
		if (player.meshbox.scale.y <= 0.1) {
			player.ducking = false
		}
	} else if (player.meshbox.scale.y < 1) {
		player.meshbox.scale.y += Math.min(0.04, 1 - player.meshbox.scale.y)
	}


	// landing
	if (is_on_ground(player.mesh, player.meshbox.geometry.parameters.height, player.platform_height)) {
		player.jumping = false
		set_bottom(player.mesh, player.meshbox.geometry.parameters.height, player.platform_height)
		player.velocity.y = 0
	}
	// console.log(player.mesh.position.y, player.platform_height)
	// console.log(player.ducking, player.jumping)

	// track switching
	if (player.switching_track) {
		// check if we reached the track
		const track = tracks[player.track_id]
		if (Math.abs(player.mesh.position.x - track.position.x) < 0.1) {
			player.switching_track = false
			player.velocity.x = 0
			player.mesh.position.x = track.position.x
		}
	}

	if (!player.alive) {
		player.meshbox.material.color.set('red')
	} else if (player.platform_height > 0) {
		player.meshbox.material.color.set('green')
	}
}

function player_jump() {
	if (player.jumping) return
	player_unduck()

	set_bottom(player.mesh, player.meshbox.geometry.parameters.height, player.platform_height)
	player.jumping = true
	player.velocity.y = 5
}

function player_unjump() {
	player.jumping = false
	player.velocity.y = -5
}

function player_duck() {
	if (player.ducking) return
	player.animations['duck'].reset()
	player_unjump()

	player.ducking = true
}

function player_unduck() {
	player.ducking = false
	player.meshbox.scale.y = 1
}

function set_bottom(obj, height, y) {
	obj.position.y = y + height / 2
}

function is_on_ground(obj, height, ground = 0) {
	return obj.position.y <= ground + height / 2
}

function update_animations() {
	if (!player.mixer) return

	if (!player.alive) {
		player.animations['run'].stop()
		return
	}
	if (player.jumping) {
		player.animations['jump'].play()
		player.animations['run'].paused = true
		return
	}
	if (player.ducking) {
		// player.animations['duck'].reset()
		player.animations['duck'].play()
		player.animations['run'].paused = true
		return
	}
	player.animations['run'].paused = false
	player.animations['run'].play()
	player.animations['jump'].stop()
	// player.animations['duck'].stop()
}

function animate() {
	requestAnimationFrame(animate)

	update_trains()
	update_player()

	if (player.alive) {
		// track texture scrolling
		for (let i = 0; i < tracks.length; i++) {
			const track = tracks[i]
			track.material.map.offset.y += 0.005
		}
	}

	// set camera position y fixed with player.platform_height
	camera.position.x += (player.mesh.position.x - camera.position.x) * 0.1
	camera.position.y += (player.platform_height + 2 - camera.position.y) * 0.01

	update_animations()

	// controls.update()
	renderer.render(scene, camera)
}

// setup keyboard
document.addEventListener('keydown', (event) => {
	switch (event.key) {
		case 'ArrowLeft':
			switch_track(-1)
			break
		case 'ArrowRight':
			switch_track(1)
			break
		case 'ArrowUp':
			player_jump()
			break
		case 'ArrowDown':
			player_duck()
			break
		case 'r':
			window.location.reload()
			break
	}
})

window.addEventListener('resize', () => {
	renderer.setSize(window.innerWidth, window.innerHeight)
	camera.aspect = window.innerWidth / window.innerHeight
	camera.updateProjectionMatrix()
})

function add_ground() {
	const ground = new THREE.Mesh(
		new THREE.PlaneGeometry(100, 100),
		new THREE.MeshBasicMaterial({ color: 'green' }),
	)
	ground.rotation.x = -Math.PI / 2
	ground.position.y = -0.2
	scene.add(ground)
	ground.material.transparent = true
	ground.material.side = THREE.DoubleSide
	ground.material.opacity = 0.4
}

function add_character() {
	// load fbx
	const loader = new FBXLoader()
	loader.load('../Running.fbx', (object) => {
		object.scale.set(0.1, 0.1, 0.1)
		object.rotation.y = Math.PI
		object.position.y = -0.2
		filter_model(object, ['Jake_sandwich1', 'Jake_sprayCan1'])
		player.mesh.add(object)

		player.mixer = new THREE.AnimationMixer(object)
		const action = player.mixer.clipAction(object.animations[0])
		action.play()

		for (let key in player.animations) {
			player.animations[key] = player.mixer.clipAction(object.animations[0])
		}

		// update animation
		const clock = new THREE.Clock()
		const animate = () => {
			requestAnimationFrame(animate)
			const delta = clock.getDelta()
			player.mixer.update(delta)
		}
		animate()
	})

	loader.load('../Jump.fbx', (object) => {
		player.animations['jump'] = player.mixer.clipAction(object.animations[0])
		player.animations['jump'].setLoop(THREE.LoopOnce)
	})

	// loader.load('../Stand To Roll.fbx', (object) => {
	loader.load('../Running Slide.fbx', (object) => {
		player.animations['duck'] = player.mixer.clipAction(object.animations[0])
		player.animations['duck'].setLoop(THREE.LoopOnce)
		player.animations['duck'].setDuration(0.8)
	})

	// load subway mtl
	const mtlLoader = new MTLLoader()
	mtlLoader.load('../Subway/Subway.mtl', (materials) => {
		materials.preload()

		// load subway obj
		const objLoader = new OBJLoader()
		objLoader.setMaterials(materials)
		objLoader.load('../Subway/Subway.obj', (object) => {
			object.scale.set(0.06, 0.06, 0.06)
			object.rotation.y = Math.PI
			// filter_model(object,[])
			models['subway'] = object
			// get z length
			const box = new THREE.Box3().setFromObject(object.children[0])
			models['subway'].userData.orig_length = box.max.z - box.min.z
		})
	})


}

function add_lights() {
	const ambientLight = new THREE.AmbientLight(0xffffff, 5)
	scene.add(ambientLight)
}

function filter_model(model, names) {
	model.traverse((child) => {
		// console.log(child.type, child.name)
		if (child.type == 'SkinnedMesh') {
			if (names.includes(child.name)) {
				child.visible = false
			}
		}
	})
}

load_textures()
add_ground()
add_lights()
gen_tracks()
gen_train()
add_player()
add_character()
animate()