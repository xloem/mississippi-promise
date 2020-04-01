const miss = require('mississippi')
const util = require('util')

module.exports.pipe = util.promisify(miss.pipe)
module.exports.each = (stream, each) => util.promisify(miss.each)(stream, util.callbackify(each))
module.exports.pipeline = miss.pipeline
module.exports.duplex = miss.duplex
module.exports.through = require('through2-promise')
module.exports.from = (options, read) => {
	if (typeof options !== 'object' || Array.isArray(options)) {
		read = options
		options = {}
	}
	if (!Array.isArray(read) && read) {
		read = util.callbackify(read)
	}
	return miss.from(options, read)
}
module.exports.from.obj = (options, read) => {
	if (typeof options !== 'object' || Array.isArray(options)) {
		read = options
		options = {}
	}
	if (!Array.isArray(read) && read) {
		read = util.callbackify(read)
	}
	return miss.from.obj(options, read)
}
module.exports.to = (options, write, flush) => {
	if (typeof options === 'function') {
		flush = write
		write = options
		options = {}
	}
	return miss.to(options, util.callbackify(write), flush && util.callbackify(flush))
}
module.exports.to.obj = (options, write, flush) => {
	if (typeof options === 'function') {
		flush = write
		write = options
		options = {}
	}
	return miss.to.obj(options, util.callbackify(write), flush && util.callbackify(flush))
}
module.exports.concat = (...streams) => {
	return new Promise((resolve, reject) => {
		miss.pipe(
			...streams,
			miss.concat(resolve),
			(error) => (error && reject(error))
		)
	})
}
module.exports.finished = util.promisify(miss.finished)
module.exports.parallel = (concurrency, each) => {
	return miss.parallel(concurrency, util.callbackify(each))
}
module.exports.split = require('node-binary-split')
module.exports.merge = require('merge2')
module.exports.pull = require('stream-shift-promise')
