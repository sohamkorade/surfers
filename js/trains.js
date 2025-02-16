import * as THREE from 'three'
import { world, globals } from './world.js'
import * as TWEEN from 'tween'

function update_trains() {
	const { scene, trains, player } = world

	if (trains.length < globals.MAX_TRAINS) {
		gen_train();
	}

	player.platform_height = 0;
	const player_bottom = player.mesh.position.y - player.meshbox.geometry.parameters.height / 2;
	const player_front = player.mesh.position.z + player.meshbox.geometry.parameters.depth / 2 - 0.5;

	// set color to blue
	player.meshbox.material.color.set('blue');

	for (let i = 0; i < trains.length; i++) {
		const train = trains[i];

		// if goes out of screen, remove it
		if (train.position.z > 10) {
			scene.remove(train);
			trains.splice(i, 1);
			continue;
		}

		// move forward
		train.position.z += train.userData.speed;

		// check if it hits the player
		const train_top = train.position.y + train.geometry.parameters.height / 2;
		const train_front = train.position.z + train.geometry.parameters.depth / 2;
		const train_back = train.position.z - train.geometry.parameters.depth / 2;

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
			const ramp = train.getObjectByName('ramp');
			if (ramp) {
				// ramp collision
				if (new THREE.Box3().setFromObject(player.meshbox).expandByScalar(2).intersectsBox(new THREE.Box3().setFromObject(ramp))) {
					player.ramping = true;

					// get intersection point of ramp's top and player's bottom
					const raycaster = new THREE.Raycaster(
						new THREE.Vector3(player.mesh.position.x, -10, player_front),
						new THREE.Vector3(0, 5, 0)
					);
					const intersects = raycaster.intersectObject(ramp);
					if (intersects.length > 0) {
						const intersection = intersects[0].point;
						// player.mesh.position.y = intersection.y + 1 + player.meshbox.geometry.parameters.height / 3;

						// // rotate player
						// player.meshbox.rotation.x = Math.PI / 4
						player.platform_height = intersection.y;
						// console.log(player.platform_height)
					}
				}
			}



			// if player is on top of the train
			if (Math.abs(player.mesh.position.x - train.position.x) < 1
				&& player_bottom >= train_top) {
				// middle
				if (train_front >= player_front && train_back <= player_front) {
					player.meshbox.material.color.set('green');
					player.platform_height = train_top;
					player.ramping = false;
				}
			}
		}

		// let ignore_collision = false
		// if (player.ducking) {
		// 	if (train.userData.barrier_type == 'barrier_duck'
		// 		|| train.userData.barrier_type == 'barrier_jump_or_duck') {
		// 		ignore_collision = true
		// 	}
		// }
		if (!player.ramping && player.platform_height == 0) {
			// ensure player is on the middle of the train
			if (train.userData.barrier_type != 'train' || train_back <= player_front - 1) {
				// box collision
				if (new THREE.Box3().setFromObject(player.mesh).intersectsBox(new THREE.Box3().setFromObject(train))) {
					if (!globals.CHEATS) {
						player.alive = false;
					}
					// player.velocity.x *=-0.9
					// player.speed *=-0.9
					player.speed *= -0.5
					setTimeout(() => {
						player.speed=0.1
					}, 300)
					console.log('hit')
					break

					player.meshbox.material.color.set('red');
				}
			}
		}
	}
	// console.log(player.ducking, player.jumping)
	// console.log(player.platform_height, player.mesh.position.y)
}


function gen_train() {
	const { scene, models, textures, trains, tracks, player } = world
	const train_length = 10 + Math.random() * 10

	const barriers = {
		'barrier_jump': {
			mesh: new THREE.Mesh(
				new THREE.BoxGeometry(1, player.HEIGHT * 2, 0.2),
				new THREE.MeshBasicMaterial({ color: 'orange' }),
			),
			position: new THREE.Vector3(0, player.HEIGHT, 0),
		},
		'barrier_jump_or_duck': {
			mesh: new THREE.Mesh(
				new THREE.BoxGeometry(1, player.HEIGHT * 2, 0.2),
				new THREE.MeshBasicMaterial({ color: 'yellow' }),
			),
			position: new THREE.Vector3(0, player.HEIGHT, 0),
		},
		'barrier_duck': {
			mesh: new THREE.Mesh(
				new THREE.BoxGeometry(1, player.HEIGHT * 3, 0.2),
				new THREE.MeshBasicMaterial({ color: 'pink' }),
			),
			position: new THREE.Vector3(0, player.HEIGHT * 1.5, 0),
		},
		'train': {
			mesh: new THREE.Mesh(
				new THREE.BoxGeometry(1, player.HEIGHT * 3, train_length),
				new THREE.MeshBasicMaterial({ color: 'brown' }),
			),
			position: new THREE.Vector3(0, player.HEIGHT * 1.5, 0),
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
		barrier.material.alphaTest = 0.1
	}



	// // make transparent
	// barrier.material.transparent = true
	// barrier.material.opacity = 0.8

	barrier.position.copy(barriers[barrier_type].position)
	barrier.position.z = -50 + Math.random() * -20

	// put it on a random track
	const track_id = Math.floor(Math.random() * tracks.length)
	const track = tracks[track_id]
	barrier.position.x = track.position.x
	barrier.userData.track_id = track_id
	barrier.userData.speed = 0
	barrier.userData.barrier_type = barrier_type
	barrier.userData.train_length = barrier_type == 'train' ? train_length : 2

	let train_has_ramp = Math.random() > 0.5

	// find out if there's already a train on this track
	// if so, put it behind the train
	for (let i = 0; i < trains.length; i++) {
		const train = trains[i]
		if (train.userData.track_id == track_id) {
			// check if trains are too close
			if (train.position.z - train.userData.train_length * 1.5 < barrier.position.z) {
				barrier.position.z -= train.userData.train_length * 0.5
				// console.log('too close')
			}
			// check if the train in front is stationary
			if(train.position.z > barrier.position.z){
				if (train.userData.speed == 0) {
					train_has_ramp = true
				}
			}
		}
	}

	trains.push(barrier)
	scene.add(barrier)

	// add ramp
	if (barrier_type == 'train') {
		if (train_has_ramp) {
			const incline = new THREE.Mesh(
				new THREE.BoxGeometry(1, 0.15, 2),
				new THREE.MeshBasicMaterial({ color: 'green' }),
			)
			// shift it to the front
			incline.position.z += train_length / 2 + incline.geometry.parameters.depth / 4

			// rotate
			incline.rotation.x = Math.PI / 4

			const plane = new THREE.Mesh(
				new THREE.BoxGeometry(1, 0.15, 0.8),
				new THREE.MeshBasicMaterial({ color: 'darkgreen' }),
			)
			plane.rotation.x = -Math.PI / 4
			plane.position.z -= plane.geometry.parameters.depth * 1.8
			plane.material.visible = false
			const ramp = new THREE.Group()
			incline.add(plane)
			ramp.add(incline)
			ramp.name = 'ramp'

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

export { update_trains, gen_train }