const miss = require('mississippi')
const util = require('util')

module.exports.pipe = util.promisify(miss.pipe)
module.exports.each = (stream, each) => util.promisify(miss.each)(stream, util.callbackify(each))
module.exports.pipeline = miss.pipeline
module.exports.duplex = miss.duplex
module.exports.through = require('through2-promise')
module.exports.from = (options, read) => {
	if (
}
