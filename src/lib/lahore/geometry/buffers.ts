/** Growable Float32 buffer used while baking the generated city. */
export class FloatBuffer {
	array: Float32Array;
	length = 0;

	constructor(initial = 4096) {
		this.array = new Float32Array(initial);
	}

	private ensure(extra: number) {
		if (this.length + extra <= this.array.length) return;
		let size = this.array.length * 2;
		while (size < this.length + extra) size *= 2;
		const next = new Float32Array(size);
		next.set(this.array.subarray(0, this.length));
		this.array = next;
	}

	push1(a: number) {
		this.ensure(1);
		this.array[this.length++] = a;
	}

	push2(a: number, b: number) {
		this.ensure(2);
		this.array[this.length++] = a;
		this.array[this.length++] = b;
	}

	push3(a: number, b: number, c: number) {
		this.ensure(3);
		this.array[this.length++] = a;
		this.array[this.length++] = b;
		this.array[this.length++] = c;
	}

	push4(a: number, b: number, c: number, d: number) {
		this.ensure(4);
		this.array[this.length++] = a;
		this.array[this.length++] = b;
		this.array[this.length++] = c;
		this.array[this.length++] = d;
	}

	toArray(): Float32Array {
		return this.array.slice(0, this.length);
	}
}
