import * as THREE from 'three'
import { OrbitControls } from 'OrbitControls'

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

camera.position.y = 2
camera.position.z = 3

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const clock = new THREE.Clock()

// orbit control
const controls = new OrbitControls(camera, renderer.domElement)
controls.update()

const tracks = []

const max_trains = 2

const trains = []

const GROUND_HEIGHT = 0.2

const player = {
	mesh: null,
	track: null,
	velocity: new THREE.Vector3(0, 0, 0),
	switching_track: false,
	platform_height: GROUND_HEIGHT,
	alive: true,
	ducking: false,
	jumping: false,
}

function gen_tracks() {
	const track_geometry = new THREE.BoxGeometry(1, 0.2, 100)
	const track_material = new THREE.MeshBasicMaterial({ color: 'gray' })

	const max_tracks = 3
	const track_width = 1.2

	for (let i = 0; i < max_tracks; i++) {
		const track = new THREE.Mesh(track_geometry, track_material)
		scene.add(track)
		const mid = Math.floor(max_tracks / 2)
		track.position.x = (i - mid) * track_width
		track.position.y = -track_geometry.parameters.height
		track.position.z = -40
		tracks.push(track)
	}
}



function gen_train() {
	const train_length = 10 + Math.random() * 10

	const barrier_types = [
		{
			name: 'barrier_jump',
			mesh: new THREE.Mesh(
				new THREE.BoxGeometry(1, 2, 0.2),
				new THREE.MeshBasicMaterial({ color: 'orange' }),
			),
			position: new THREE.Vector3(0, GROUND_HEIGHT + 1.1, 0),
		},
		{
			name: 'barrier_jump_or_duck',
			mesh: new THREE.Mesh(
				new THREE.BoxGeometry(1, 0.5, 0.2),
				new THREE.MeshBasicMaterial({ color: 'yellow' }),
			),
			position: new THREE.Vector3(0, GROUND_HEIGHT+0.5, 0),
		},
		{
			name: 'barrier_duck',
			mesh: new THREE.Mesh(
				new THREE.BoxGeometry(1, 1, 0.2),
				new THREE.MeshBasicMaterial({ color: 'pink' }),
			),
			position: new THREE.Vector3(0, GROUND_HEIGHT + 0.7, 0),
		},
		{
			name: 'train',
			mesh: new THREE.Mesh(
				new THREE.BoxGeometry(1, 1, train_length),
				new THREE.MeshBasicMaterial({ color: 'brown' }),
			),
			position: new THREE.Vector3(0, GROUND_HEIGHT, 0),
		},
	]

	// choose a random barrier type
	const barrier_type = barrier_types[Math.floor(Math.random() * barrier_types.length)]
	// const barrier_type = barrier_types[2]
	const barrier = barrier_type.mesh

	scene.add(barrier)
	trains.push(barrier)

	// make transparent
	barrier.material.transparent = true
	barrier.material.opacity = 0.8

	barrier.position.set(barrier_type.position.x, barrier_type.position.y, barrier_type.position.z)
	barrier.position.z = -30 + Math.random() * -10

	// put it on a random track
	const track_id = Math.floor(Math.random() * tracks.length)
	const track = tracks[track_id]
	barrier.position.x = track.position.x
	barrier.userData.track_id = track_id
}


function update_trains() {
	if (trains.length < max_trains) {
		gen_train()
	}

	player.platform_height = GROUND_HEIGHT
	const player_bottom = player.mesh.position.y - player.mesh.geometry.parameters.height / 2
	const player_front = player.mesh.position.z + player.mesh.geometry.parameters.depth / 2
	// set color to blue
	player.mesh.material.color.set('blue')

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
			train.position.z += 0.1
		}

		// check if it hits the player
		const train_height = train.geometry.parameters.height
		const train_top = train.position.y + train_height / 2
		const train_front = train.position.z + train.geometry.parameters.depth / 2
		const train_back = train.position.z - train.geometry.parameters.depth / 2


		// box collision
		if (new THREE.Box3().setFromObject(player.mesh).intersectsBox(new THREE.Box3().setFromObject(train))) {
			// dead
			player.alive = false
			player.mesh.material.color.set('red')
		}

		// if player is on top of the train
		if (player.track_id == train.userData.track_id
			&& player_bottom > train_top
			&& train_front > player_front
			&& train_back < player_front
		) {
			player.mesh.material.color.set('green')
			player.platform_height = train_top + GROUND_HEIGHT
		}
	}
	// console.log(player.platform_height, player.mesh.position.y)
}

function add_player() {
	const player_geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5)
	player.mesh = new THREE.Mesh(player_geometry, new THREE.MeshBasicMaterial({ color: 'blue' }))
	scene.add(player.mesh)

	player.mesh.position.y = 0.3

	// put it on a random track
	player.track_id = Math.floor(Math.random() * tracks.length)
	const track = tracks[player.track_id]
	player.mesh.position.x = track.position.x
}

function switch_track(offset) {
	const track = tracks[player.track_id]

	const new_track = tracks[player.track_id + offset]
	// check if there is a track on the offset
	if (!new_track) return

	const player_front = player.mesh.position.z + player.mesh.geometry.parameters.depth / 2

	// check if there is a train on the new track in case player is on ground
	if (player.mesh.position.y <= player.platform_height) {
		for (let i = 0; i < trains.length; i++) {
			const train = trains[i]
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
	player.mesh.position.z += player.velocity.z * delta

	// gravity
	player.velocity.y -= 0.1

	// ducking
	if (player.mesh.scale.y < 1 && !player.ducking) {
		player.mesh.scale.y += 0.015
		if (player.mesh.scale.y >= 1) {
			player.mesh.scale.y = 1
		}
	} else if (player.ducking) {
		player.mesh.scale.y -= 0.04
		if (player.mesh.scale.y <= 0.1) {
			player.ducking = false
		}
	}

	player.mesh.position.y -= (1 - player.mesh.scale.y) / 2.5
	// landing
	if (player.mesh.position.y <= player.platform_height) {
		player.jumping = false
		set_bottom(player.mesh, player.platform_height)
		player.velocity.y = 0
	}

	console.log(player.ducking, player.jumping)

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
		player.mesh.material.color.set('red')
	}
}

function player_jump() {
	// check if we are on the ground
	if (!player.jumping) {
		// reset ducking
		player.mesh.scale.y = 1
		// player.mesh.position.y = player.platform_height

		player.ducking = false

		player.jumping = true
		player.velocity.y = 5
	}
}

function player_duck() {
	if (!player.ducking) {
		player.ducking = true

		// reset jumping
		if (player.jumping) {
			player.velocity.y -= 0.1
		}
	}
}

function set_bottom(obj, y) {
	obj.position.y = y
}


function animate() {
	requestAnimationFrame(animate)

	update_trains()
	update_player()

	renderer.render(scene, camera)
}

// setup keyboard
document.addEventListener('keydown', (event) => {
	switch (event.key) {
		case 'ArrowLeft':
			player.alive && switch_track(-1)
			break
		case 'ArrowRight':
			player.alive && switch_track(1)
			break
		case 'ArrowUp':
			player.alive && player_jump()
			break
		case 'ArrowDown':
			player.alive && player_duck()
			break
		case 'r':
			// restart
			window.location.reload()
			break
	}
})

gen_tracks()
gen_train()
add_player()
animate()