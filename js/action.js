import { update_animations, update_player } from './player.js'
import { update_trains } from './trains.js'
import { world } from './world.js'
import * as THREE from 'three'
import * as TWEEN from 'tween'

function update(delta) {
	update_trains(delta)
	update_player(delta)

	const { camera, player, tracks } = world

	// set camera position y fixed with player.platform_height
	if (world.camera == world.follow_cam) {
		camera.position.x += (player.mesh.position.x - camera.position.x) * 0.1
		camera.position.y += (player.platform_height + 2 - camera.position.y) * 0.01
	}

	player_move_forward()
	update_animations(delta)
	TWEEN.update()

	// world.platform.position.y = player.platform_height
	// world.platform.position.x = player.mesh.position.x
}

function player_move_forward() {
	if (!world.player.alive) return
	if (!world.player.running) return

	const { player, tracks, trains } = world

	for (let i = 0; i < trains.length; i++) {
		const train = trains[i]
		train.position.z += player.speed
	}

	// track texture scrolling
	for (let i = 0; i < tracks.length; i++) {
		const track = tracks[i]
		track.material.map.offset.y += 0.05 * player.speed
	}
}


function action() {
	const clock = new THREE.Clock()
	let lastElapsedTime = 0
	function tick() {
		requestAnimationFrame(tick)
		const { renderer, scene, camera } = world

		const elapsedTime = clock.getElapsedTime()
		const delta = elapsedTime - lastElapsedTime
		lastElapsedTime = elapsedTime

		update(delta)

		renderer.render(scene, camera)
	}
	tick()
}

export { action }