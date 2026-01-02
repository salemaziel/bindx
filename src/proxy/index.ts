export {
	type ModelProxy,
	type ModelProxyArray,
	type ModelProxyArrayResult,
	type ModelProxyScalar,
	type ProxyMeta,
	type UnwrapProxy,
	type CompositionMarker,
	PROXY_META,
} from './types.js'

export {
	createModelProxy,
	getProxyPath,
	isModelProxy,
	isArrayMapResult,
	getArrayMapResult,
} from './createModelProxy.js'
