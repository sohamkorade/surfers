import * as THREE from 'three'
import { world } from './world.js'
import { gen_train } from './trains.js'
import { init_player } from './player.js'
import { load_character } from './loader.js'

function gen_tracks() {
	const { scene, tracks, textures } = world

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



function add_ground() {
	const { scene } = world

	const ground = new THREE.Mesh(
		new THREE.PlaneGeometry(500, 500),
		new THREE.MeshBasicMaterial({ color: 'green' }),
	)
	ground.rotation.x = -Math.PI / 2
	ground.position.y = -0.2
	scene.add(ground)
	ground.material.transparent = true
	ground.material.side = THREE.DoubleSide
	ground.material.opacity = 0.4
}



function add_lights() {
	const { scene } = world
	const ambientLight = new THREE.AmbientLight(0xffffff, 5)
	scene.add(ambientLight)
}

function build_scene() {
	add_ground()
	gen_tracks()
	gen_train()
	init_player()
	load_character()
}

export { build_scene, add_lights }