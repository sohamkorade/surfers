import * as THREE from 'three'
import { world } from './world.js'
import * as TWEEN from 'tween'

const { tracks, trains, clock, player, models } = world

function player_switch_track(offset) {
	if (!player.alive) return

	const track = tracks[player.track_id]

	const new_track = tracks[player.track_id + offset]
	// check if there is a track on the offset
	if (!new_track) return

	const player_front = player.mesh.position.z + player.meshbox.geometry.parameters.depth / 2

	// check if there is a train on the new track in case player is on ground
	if (is_on_ground(player.mesh, player.meshbox.geometry.parameters.height)) {
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

function update_player(delta) {

	// update position
	player.mesh.position.addScaledVector(player.velocity, delta)

	// gravity
	player.velocity.y -= 10 * delta

	// ducking
	if (player.ducking) {
		// shrink
		player.meshbox.scale.y -= 0.01
		if (player.meshbox.scale.y <= 0.1) {
			player.ducking = false
		}
	} else if (player.meshbox.scale.y < 1) {
		player.meshbox.scale.y += Math.min(0.01, 1 - player.meshbox.scale.y)
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
	if (!player.animations) return

	if (!player.alive || !player.running) {
		player.animations['run'].stop()
		// player.animations['dead'].play()
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



function init_player() {
	const { scene, tracks, player } = world
	player.mesh = new THREE.Group()
	player.meshbox = new THREE.Mesh(
		new THREE.BoxGeometry(player.HEIGHT, player.HEIGHT, player.HEIGHT),
		new THREE.MeshBasicMaterial({ color: 'blue' }),
	)

	player.mesh.add(player.meshbox)

	// world.platform=new THREE.Mesh(
	// 	new THREE.BoxGeometry(2, 0.1, 2),
	// 	new THREE.MeshBasicMaterial({ color: 'yellow' }),
	// )
	// world.platform.position.y = -0.2
	// scene.add(world.platform)

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

export { update_player, player_switch_track, player_jump, player_duck, player_unduck, update_animations, init_player }