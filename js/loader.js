import { world } from './world.js'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'

const { textures, models } = world

function load_textures() {
	textures['tracks'] = new THREE.TextureLoader().load('./assets/tracks.png')
	textures['barrier_jump'] = new THREE.TextureLoader().load('./assets/barrier_jump.jpg')
	textures['barrier_jump_or_duck'] = new THREE.TextureLoader().load('./assets/barrier_jump_or_duck.jpg')
	textures['barrier_duck'] = new THREE.TextureLoader().load('./assets/barrier_duck.jpg')
}


function load_models() {
	// // load subway mtl
	// const mtlLoader = new MTLLoader()
	// mtlLoader.load('./assets/Subway/Subway.mtl', (materials) => {
	// 	materials.preload()

	// 	// load subway obj
	// 	const objLoader = new OBJLoader()
	// 	objLoader.setMaterials(materials)
	// 	objLoader.load('./assets/Subway/Subway.obj', (object) => {
	// 		object.scale.set(0.06, 0.06, 0.06)
	// 		object.rotation.y = Math.PI
	// 		// filter_model(object,[])
	// 		models['subway'] = object
	// 		// get z length
	// 		const box = new THREE.Box3().setFromObject(object.children[0])
	// 		models['subway'].userData.orig_length = box.max.z - box.min.z
	// 	})
	// })

	// load subway gltf
	const loader = new GLTFLoader()
	loader.load('./assets/subway.gltf', (gltf) => {
		models['subway'] = gltf.scene
		// get z length
		const box = new THREE.Box3().setFromObject(gltf.scene.children[0])
		models['subway'].userData.orig_length = box.max.z - box.min.z
	})

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

function load_character() {
	const { player } = world
	const character = "Jake"

	// // clear previous character
	// if (player.mesh) {
	// 	player.mesh.children.forEach((child) => {
	// 		if (child.name == 'character') {
	// 			player.mesh.remove(child)
	// 		}
	// 	})
	// }

	// // clear previous animations
	// player.animations = {}

	// // clear previous mixer
	// if (player.mixer) {
	// 	player.mixer.stopAllAction()
	// 	player.mixer = null
	// }

	// load fbx
	const loader = new FBXLoader()
	loader.load(`./assets/${character} Running.fbx`, (object) => {
		object.scale.set(0.1, 0.1, 0.1)
		object.rotation.y = Math.PI
		object.position.y = -0.2
		object.name = 'character'
		filter_model(object, ['Jake_sandwich1', 'Jake_sprayCan1'])
		player.mesh.add(object)

		// // cover the player with a box
		// const box = new THREE.Box3().setFromObject(object)
		// const box_size = box.getSize(new THREE.Vector3()).multiplyScalar(20)
		// player.meshbox.scale.set(box_size.x, box_size.y, box_size.z)

		player.mixer = new THREE.AnimationMixer(object)
		player.animations['run']= player.mixer.clipAction(object.animations[0])
		player.animations['run'].play()

		// update animation
		const clock = new THREE.Clock()
		const animate = () => {
			requestAnimationFrame(animate)
			const delta = clock.getDelta()
			player.mixer.update(delta)
		}
		animate()
	})

	loader.load(`./assets/${character} Jump.fbx`, (object) => {
		player.animations['jump'] = player.mixer.clipAction(object.animations[0])
		player.animations['jump'].setLoop(THREE.LoopOnce)
	})
	loader.load(`./assets/${character} Fall Flat.fbx`, (object) => {
		player.animations['dead'] = player.mixer.clipAction(object.animations[0])
		player.animations['dead'].setLoop(THREE.LoopOnce)
	})

	loader.load(`./assets/${character} Running Slide.fbx`, (object) => {
		player.animations['duck'] = player.mixer.clipAction(object.animations[0])
		player.animations['duck'].setLoop(THREE.LoopOnce)
		player.animations['duck'].setDuration(0.8)
	})

}


async function load_assets() {
	load_textures()
	load_models()
}

export { load_assets, load_character }