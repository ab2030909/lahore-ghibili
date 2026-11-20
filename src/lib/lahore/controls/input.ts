/**
 * Keyboard / mouse / touch input mirroring the original controls:
 * WASD or arrows to move, Shift to sprint, Space to jump, drag to rotate the camera.
 * Additions for the heritage layer: E / Enter to interact, H to open the collection,
 * C to call / put away the Sohrab cycle, K to call the boat at the water, R for the bell.
 */

export type InputCallbacks = {
	onJump?: () => void;
	onInteract?: () => void;
	onCollection?: () => void;
	onEscape?: () => void;
	onMute?: () => void;
	onBike?: () => void;
	onBoat?: () => void;
	onBell?: () => void;
	onDrag?: (dx: number, dy: number) => void;
	onDragState?: (dragging: boolean) => void;
	onAnyInput?: () => void;
};

export class InputController {
	private keys = new Set<string>();
	private target: HTMLElement;
	private callbacks: InputCallbacks;
	private pointerId: number | null = null;
	private lastX = 0;
	private lastY = 0;
	private touchMove: { id: number; x0: number; y0: number; x: number; y: number } | null = null;
	enabled = true;
	sprint = false;

	constructor(target: HTMLElement, callbacks: InputCallbacks) {
		this.target = target;
		this.callbacks = callbacks;
		window.addEventListener('keydown', this.onKeyDown);
		window.addEventListener('keyup', this.onKeyUp);
		window.addEventListener('blur', this.onBlur);
		target.addEventListener('pointerdown', this.onPointerDown);
		window.addEventListener('pointermove', this.onPointerMove);
		window.addEventListener('pointerup', this.onPointerUp);
		window.addEventListener('pointercancel', this.onPointerUp);
		target.addEventListener('contextmenu', (e) => e.preventDefault());
	}

	/** Movement vector in camera space: x = right, z = back. */
	get move(): { x: number; z: number } {
		if (!this.enabled) return { x: 0, z: 0 };
		let x = 0;
		let z = 0;
		if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
		if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;
		if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
		if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
		if (this.touchMove) {
			const dx = (this.touchMove.x - this.touchMove.x0) / 60;
			const dy = (this.touchMove.y - this.touchMove.y0) / 60;
			x += Math.max(-1, Math.min(1, dx));
			z += Math.max(-1, Math.min(1, dy));
		}
		return { x, z };
	}

	private isTyping(e: KeyboardEvent) {
		const el = e.target as HTMLElement | null;
		return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
	}

	private onKeyDown = (e: KeyboardEvent) => {
		if (this.isTyping(e)) return;
		this.callbacks.onAnyInput?.();
		if (e.code === 'Escape') {
			this.callbacks.onEscape?.();
			return;
		}
		if (e.code === 'KeyH' && !e.repeat) {
			this.callbacks.onCollection?.();
			return;
		}
		if (e.code === 'KeyK' && !e.repeat) {
			this.callbacks.onBoat?.();
			return;
		}
		if (e.code === 'KeyM' && !e.repeat) {
			this.callbacks.onMute?.();
			return;
		}
		if (e.code === 'KeyC' && !e.repeat) {
			this.callbacks.onBike?.();
			return;
		}
		if (e.code === 'KeyR' && !e.repeat) {
			this.callbacks.onBell?.();
			return;
		}
		if ((e.code === 'KeyE' || e.code === 'Enter') && !e.repeat) {
			this.callbacks.onInteract?.();
			return;
		}
		if (!this.enabled) return;
		if (e.code === 'Space') {
			e.preventDefault();
			if (!e.repeat) this.callbacks.onJump?.();
		}
		if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.sprint = true;
		if (e.code.startsWith('Arrow')) e.preventDefault();
		this.keys.add(e.code);
	};

	private onKeyUp = (e: KeyboardEvent) => {
		if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.sprint = false;
		this.keys.delete(e.code);
	};

	private onBlur = () => {
		this.keys.clear();
		this.sprint = false;
	};

	private onPointerDown = (e: PointerEvent) => {
		this.callbacks.onAnyInput?.();
		if (e.pointerType === 'touch' && e.clientX < window.innerWidth * 0.45) {
			this.touchMove = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY };
			return;
		}
		this.pointerId = e.pointerId;
		this.lastX = e.clientX;
		this.lastY = e.clientY;
		this.callbacks.onDragState?.(true);
		this.target.setPointerCapture?.(e.pointerId);
	};

	private onPointerMove = (e: PointerEvent) => {
		if (this.touchMove && e.pointerId === this.touchMove.id) {
			this.touchMove.x = e.clientX;
			this.touchMove.y = e.clientY;
			return;
		}
		if (this.pointerId !== e.pointerId) return;
		const dx = e.clientX - this.lastX;
		const dy = e.clientY - this.lastY;
		this.lastX = e.clientX;
		this.lastY = e.clientY;
		if (this.enabled) this.callbacks.onDrag?.(dx, dy);
	};

	private onPointerUp = (e: PointerEvent) => {
		if (this.touchMove && e.pointerId === this.touchMove.id) {
			const moved = Math.hypot(this.touchMove.x - this.touchMove.x0, this.touchMove.y - this.touchMove.y0);
			if (moved < 8) this.callbacks.onJump?.();
			this.touchMove = null;
			return;
		}
		if (this.pointerId !== e.pointerId) return;
		this.pointerId = null;
		this.callbacks.onDragState?.(false);
	};

	clear() {
		this.keys.clear();
		this.sprint = false;
		this.touchMove = null;
	}

	dispose() {
		window.removeEventListener('keydown', this.onKeyDown);
		window.removeEventListener('keyup', this.onKeyUp);
		window.removeEventListener('blur', this.onBlur);
		this.target.removeEventListener('pointerdown', this.onPointerDown);
		window.removeEventListener('pointermove', this.onPointerMove);
		window.removeEventListener('pointerup', this.onPointerUp);
		window.removeEventListener('pointercancel', this.onPointerUp);
	}
}
