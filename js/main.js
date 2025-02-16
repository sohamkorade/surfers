import { world } from './world.js'
import { WEBGL } from 'WEBGL'
import 'hammerjs'
import { init_cameras, init_keys, init_orbit, init_swipes } from './controls.js'
import { init_canvas } from './canvas.js'
import { init_gui } from './gui.js'
import { add_lights, build_scene } from './scene.js'
import { load_assets } from './loader.js'
import { action } from './action.js'

function init_controls() {
	init_keys()
	init_swipes()
	init_orbit()
}


async function main() {
	if (!WEBGL.isWebGLAvailable()) {
		document.body.appendChild(WEBGL.getWebGLErrorMessage())
		return
	}

	init_canvas()
	await load_assets()
	init_gui()
	build_scene()
	init_cameras()
	init_controls()
	add_lights()

	world.camera=world.follow_cam
	action()
	console.log('main() done')
}


main()