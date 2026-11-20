import { BufferAttribute, BufferGeometry } from 'three';

/**
 * Decoder for the `.drc` character container used by the bundled rigs:
 * either a raw Draco stream whose metadata entry "info" lists attribute names/types by
 * unique id, or a 4-byte header length + JSON header + Draco stream. Unlike the stock
 * DRACOLoader it keeps every generic attribute (skinIndex, skinWeight, surfaceId, bone
 * quaternions, hierarchy...) and the animation userData (fps, frames).
 */

type DracoModule = {
	Decoder: new () => DracoDecoder;
	Mesh: new () => DracoGeometry;
	PointCloud: new () => DracoGeometry;
	MetadataQuerier: new () => { HasEntry(md: unknown, key: string): boolean; GetStringEntry(md: unknown, key: string): string };
	TRIANGULAR_MESH: number;
	HEAPF32: Float32Array;
	_malloc(size: number): number;
	_free(ptr: number): void;
	destroy(obj: unknown): void;
	DT_FLOAT32: number;
	DT_INT8: number;
	DT_INT16: number;
	DT_INT32: number;
	DT_UINT8: number;
	DT_UINT16: number;
	DT_UINT32: number;
};

type DracoGeometry = { ptr: number; num_points(): number; num_faces(): number };

type DracoDecoder = {
	GetEncodedGeometryType(data: Int8Array): number;
	DecodeArrayToMesh(data: Int8Array, size: number, out: DracoGeometry): { ok(): boolean; error_msg(): string };
	DecodeArrayToPointCloud(data: Int8Array, size: number, out: DracoGeometry): { ok(): boolean; error_msg(): string };
	GetMetadata(geo: DracoGeometry): { ptr: number };
	GetAttributeByUniqueId(geo: DracoGeometry, id: number): { num_components(): number };
	GetAttributeDataArrayForAllPoints(geo: DracoGeometry, attr: unknown, type: number, bytes: number, ptr: number): boolean;
	GetTrianglesUInt32Array(geo: DracoGeometry, bytes: number, ptr: number): boolean;
};

const TYPE_NAMES = [
	'Int8Array',
	'Uint8Array',
	'Uint8ClampedArray',
	'Int16Array',
	'Uint16Array',
	'Int32Array',
	'Uint32Array',
	'Float32Array',
	'Float64Array'
] as const;

type TypedCtor =
	| Int8ArrayConstructor
	| Uint8ArrayConstructor
	| Int16ArrayConstructor
	| Uint16ArrayConstructor
	| Int32ArrayConstructor
	| Uint32ArrayConstructor
	| Float32ArrayConstructor;

const CTORS: Record<string, TypedCtor> = {
	Int8Array,
	Uint8Array,
	Uint8ClampedArray: Uint8Array,
	Int16Array,
	Uint16Array,
	Int32Array,
	Uint32Array,
	Float32Array,
	Float64Array: Float32Array
};

let modulePromise: Promise<DracoModule> | null = null;

function getModule(): Promise<DracoModule> {
	if (modulePromise) return modulePromise;
	modulePromise = (async () => {
		const [wrapper, wasm] = await Promise.all([
			fetch('/draco/draco_wasm_wrapper.js').then((r) => r.text()),
			fetch('/draco/draco_decoder.wasm').then((r) => r.arrayBuffer())
		]);
		// eslint-disable-next-line @typescript-eslint/no-implied-eval
		const factory = new Function(`${wrapper}\nreturn DracoDecoderModule;`)() as (opts: {
			wasmBinary: ArrayBuffer;
			onModuleLoaded: (m: DracoModule) => void;
		}) => unknown;
		// same pattern as three's DRACOLoader worker: the module object is thenable, so
		// resolve through onModuleLoaded and strip `then` to avoid recursive resolution
		return await new Promise<DracoModule>((resolve) => {
			factory({
				wasmBinary: wasm,
				onModuleLoaded: (m) => {
					delete (m as unknown as { then?: unknown }).then;
					resolve(m);
				}
			});
		});
	})();
	return modulePromise;
}

function dataType(draco: DracoModule, ctor: TypedCtor): number {
	switch (ctor) {
		case Float32Array:
			return draco.DT_FLOAT32;
		case Int8Array:
			return draco.DT_INT8;
		case Int16Array:
			return draco.DT_INT16;
		case Int32Array:
			return draco.DT_INT32;
		case Uint8Array:
			return draco.DT_UINT8;
		case Uint16Array:
			return draco.DT_UINT16;
		default:
			return draco.DT_UINT32;
	}
}

const cache = new Map<string, Promise<BufferGeometry>>();

export function loadDracoMesh(url: string): Promise<BufferGeometry> {
	const hit = cache.get(url);
	if (hit) return hit;
	const promise = (async () => {
		const [draco, buffer] = await Promise.all([getModule(), fetch(url).then((r) => {
			if (!r.ok) throw new Error(`Failed to fetch ${url}: ${r.status}`);
			return r.arrayBuffer();
		})]);
		return decode(draco, buffer);
	})();
	cache.set(url, promise);
	return promise;
}

function decode(draco: DracoModule, buffer: ArrayBuffer): BufferGeometry {
	const head = new TextDecoder().decode(new Uint8Array(buffer.slice(0, 5)));
	const raw = head === 'DRACO';
	let info: { attributes: [string, number][]; userData?: Record<string, unknown> } | null = null;
	let data: Int8Array;
	if (raw) {
		data = new Int8Array(buffer);
	} else {
		const len = new Uint32Array(buffer.slice(0, 4))[0];
		info = JSON.parse(new TextDecoder().decode(buffer.slice(4, 4 + len)));
		data = new Int8Array(buffer.slice(4 + len));
	}
	const decoder = new draco.Decoder();
	const type = decoder.GetEncodedGeometryType(data);
	const isMesh = type === draco.TRIANGULAR_MESH;
	const geo = isMesh ? new draco.Mesh() : new draco.PointCloud();
	const status = isMesh
		? decoder.DecodeArrayToMesh(data, data.byteLength, geo)
		: decoder.DecodeArrayToPointCloud(data, data.byteLength, geo);
	if (!status.ok() || geo.ptr === 0) {
		draco.destroy(geo);
		draco.destroy(decoder);
		throw new Error(`Draco decode failed: ${status.error_msg()}`);
	}
	if (raw) {
		const querier = new draco.MetadataQuerier();
		const md = decoder.GetMetadata(geo);
		if (md && md.ptr && querier.HasEntry(md, 'info')) info = JSON.parse(querier.GetStringEntry(md, 'info'));
		draco.destroy(querier);
	}
	if (!info) throw new Error('draco: missing attribute info');

	const geometry = new BufferGeometry();
	const points = geo.num_points();
	info.attributes.forEach(([name, typeIndex], uniqueId) => {
		const ctor = CTORS[TYPE_NAMES[typeIndex] ?? 'Float32Array'];
		const attr = decoder.GetAttributeByUniqueId(geo, uniqueId);
		const components = attr.num_components();
		const length = points * components;
		const bytes = length * ctor.BYTES_PER_ELEMENT;
		const ptr = draco._malloc(bytes);
		decoder.GetAttributeDataArrayForAllPoints(geo, attr, dataType(draco, ctor), bytes, ptr);
		const array = new ctor(draco.HEAPF32.buffer as ArrayBuffer, ptr, length).slice();
		draco._free(ptr);
		const outName = name === 'position_1' ? 'position' : name;
		const isIndex = outName === 'skinIndex' || outName === 'hierarchy';
		const finalArray = isIndex || ctor === Float32Array ? array : Float32Array.from(array as ArrayLike<number>);
		geometry.setAttribute(outName, new BufferAttribute(finalArray, components));
	});
	if (isMesh) {
		const indexCount = geo.num_faces() * 3;
		const bytes = indexCount * 4;
		const ptr = draco._malloc(bytes);
		decoder.GetTrianglesUInt32Array(geo, bytes, ptr);
		const index = new Uint32Array(draco.HEAPF32.buffer, ptr, indexCount).slice();
		draco._free(ptr);
		geometry.setIndex(new BufferAttribute(index, 1));
	}
	if (info.userData) geometry.userData = { ...info.userData };
	draco.destroy(geo);
	draco.destroy(decoder);
	return geometry;
}
