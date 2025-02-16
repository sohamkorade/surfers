import { GUI } from 'GUI'
import { world } from './world.js'
import { reset_orbit_cam } from './controls.js'

const gui_items = {
	orbit_camera: () => {
		world.camera = world.orbit_cam
	},
	follow_camera: () => {
		world.camera = world.follow_cam
	},
	reset_orbit_camera: () => {
		reset_orbit_cam()
	},
	running:() => {
		const { player } = world
		player.running = !player.running
	},
}

function init_gui() {
	const gui = new GUI()

	for (const item in gui_items) {
		gui.add(gui_items, item).name(item.replace('_', ' '))
	}
}

export { init_gui }