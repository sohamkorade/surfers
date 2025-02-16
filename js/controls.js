import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { world } from './world.js'
import * as THREE from 'three'
import { player_switch_track } from './player.js'
import { player_jump } from './player.js'
import { player_duck } from './player.js'

function init_keys() {
	document.addEventListener('keyup', event => {
		if (event.key === ' ') {
			world.controls.handbrake = true
		} else if (event.key == 'c' && event.shiftKey) {
			// reset orbit camera
			reset_orbit_cam()
			console.log('reset orbit camera')
		} else if (event.key == 'c') {
			// toggle through cameras
			const cameras = [
				world.follow_cam,
				world.orbit_cam
			]
			const current_camera = world.camera
			const index = cameras.indexOf(current_camera)
			const next_camera = cameras[(index + 1) % cameras.length]
			world.camera = next_camera
		}
	})

	document.addEventListener('keydown', (event) => {
		switch (event.key) {
			case 'a':
			case 'ArrowLeft':
				if (world.controls.left) break
				player_switch_track(-1)
				break
			case 'd':
			case 'ArrowRight':
				if (world.controls.right) break
				player_switch_track(1)
				break
			case 'ArrowUp':
				if (world.controls.up) break
				player_jump()
				break
			case 'ArrowDown':
				if (world.controls.down) break
				player_duck()
				break
			case 'r':
				window.location.reload()
				break
		}
	})
	const handler = flag => event => {
		switch (event.key) {
			// case 'w':
			case 'ArrowUp':
				world.controls.up = flag
				break
			// case 's':
			case 'ArrowDown':
				world.controls.down = flag
				break
			case 'a':
			case 'ArrowLeft':
				world.controls.left = flag
				break
			case 'd':
			case 'ArrowRight':
				world.controls.right = flag
				break
			case 'w':
				world.player.speed = 0.1
				world.player.running = flag
				break
			case 's':
				world.player.speed = -0.1
				world.player.running = flag
				break
		}
	}
	document.addEventListener('keydown', handler(true))
	document.addEventListener('keyup', handler(false))
}

function init_orbit() {
	const { orbit_cam, renderer } = world
	const orbit = new OrbitControls(orbit_cam, renderer.domElement)
	orbit.enableKeys = true
	orbit.enableDamping = true

	world.orbit = orbit

	load_orbit(orbit_cam, orbit)
	orbit.addEventListener('change', save_orbit(orbit_cam, orbit))
}

function save_orbit(orbit_cam, controls) {
	return () => {
		localStorage.setItem('camera_position', JSON.stringify(orbit_cam.position))
		localStorage.setItem('camera_rotation', JSON.stringify(orbit_cam.rotation))
		localStorage.setItem('controls_target', JSON.stringify(controls.target))
	}
}

function load_orbit(orbit_cam, orbit) {
	const camera_position = JSON.parse(localStorage.getItem('camera_position'))
	const camera_rotation = JSON.parse(localStorage.getItem('camera_rotation'))
	const controls_target = JSON.parse(localStorage.getItem('controls_target'))
	if (!camera_position || !camera_rotation || !controls_target) return

	orbit_cam.position.x = camera_position.x
	orbit_cam.position.y = camera_position.y
	orbit_cam.position.z = camera_position.z
	orbit_cam.rotation._x = camera_rotation._x
	orbit_cam.rotation._y = camera_rotation._y
	orbit_cam.rotation._z = camera_rotation._z
	orbit.target.x = controls_target.x
	orbit.target.y = controls_target.y
	orbit.target.z = controls_target.z
	orbit_cam.updateProjectionMatrix()
	orbit.update()
}


function init_swipes() {
	const hammer = new Hammer(document.body, {
		recognizers: [
			[Hammer.Swipe],
			[Hammer.Tap],
			[Hammer.Tap, { event: 'doubletap', taps: 2 }],
		]
	})
	hammer.on('swipeleft', () => { player_switch_track(-1) })
	hammer.on('swiperight', () => { player_switch_track(1) })
	hammer.on('swipeup', () => { player_jump() })
	hammer.on('swipedown', () => { player_duck() })
}

function init_cameras() {
	const { scene } = world
	const follow_cam = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000)
	follow_cam.position.set(0, 2, 3)
	follow_cam.lookAt(0, 1, 0)
	follow_cam.position.x = 2
	scene.add(follow_cam)

	const orbit_cam = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000)
	orbit_cam.position.set(0, 2, 3)
	scene.add(orbit_cam)

	world.orbit_cam = orbit_cam
	world.follow_cam = follow_cam
}

function reset_orbit_cam() {
	world.orbit_cam.position.set(0, 2, 3)
	world.orbit_cam.rotation.set(0, 0, 0)
	world.orbit_cam.updateProjectionMatrix()
	world.orbit.update()
}

export { init_keys, init_swipes, init_cameras, init_orbit, reset_orbit_cam }