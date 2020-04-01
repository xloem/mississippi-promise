var miss = require('..')
var fs = require('fs')
var split = require('node-binary-split')

function assert_string(string1, string2)
{
	if (string1 !== string2) {
		throw new Error(`Strings '${string1}' differs from '${string2}'`)
	}
}
function assert_buffer(buffer1, string2)
{
	if (!(buffer1.equals(Buffer.from(string2, 'binary')))) {
		throw new Error(`Buffer '${buffer1.toString('binary')}' differs from '${string2}'`)
	}
}
function assert_contents(path1, string2)
{
	var data1 = fs.readFileSync(path1)
	if (!(data1.equals(Buffer.from(string2, 'binary')))) {
		throw new Error(`${path1} containing '${data1.toString('binary')}' differs from '${string2}'`)
	}
}

process.chdir('test')
test({
	pipe: async () => {
		var read = fs.createReadStream('example-data.txt')
		var write = fs.createWriteStream('test-data.txt')

		await miss.pipe(read, write)

		assert_contents('test-data.txt', 'Your heart, deep within everything you experience, is stronger than the deepest mountain, larger than the most expansive galaxy.')

		fs.unlinkSync('test-data.txt')
	}, each: async () => {
		var spaceSeparatedSentence = fs.createReadStream('example-data.txt')

		var pipeline = miss.pipeline(spaceSeparatedSentence, split(' '))
		
		var array = []
		await miss.each(pipeline, async word => array.push(word))

		assert_string(array.join(' '), 'Your heart, deep within everything you experience, is stronger than the deepest mountain, larger than the most expansive galaxy.')
	}, through: async () => {
		var read = fs.createReadStream('example-data.txt')
		var write = fs.createWriteStream('test-data.txt')

		var uppercaser = miss.through(
			async (chunk, enc) => chunk.toString(enc).toUpperCase(),
			async () => ' FOR REAL!'
		)

		await miss.pipe(read, uppercaser, write)

		assert_contents('test-data.txt', 'YOUR HEART, DEEP WITHIN EVERYTHING YOU EXPERIENCE, IS STRONGER THAN THE DEEPEST MOUNTAIN, LARGER THAN THE MOST EXPANSIVE GALAXY. FOR REAL!')

		fs.unlinkSync('test-data.txt')
	}, from: async () => {
		let string = fs.readFileSync('example-data.txt')
		let stream = miss.from(async size => {
			if (string.length <= 0) { return null }

			let chunk = string.slice(0, size)
			string = string.slice(size)

			return chunk
		})

		await miss.pipe(stream, fs.createWriteStream('test-data.txt'))

		assert_contents('test-data.txt', 'Your heart, deep within everything you experience, is stronger than the deepest mountain, larger than the most expansive galaxy.')

		fs.unlinkSync('test-data.txt')
	}, to: async () => {
		var read = fs.createReadStream('example-data.txt')
		var write = fs.createWriteStream('test-data.txt')

		let stream = miss.to(
			async (data) =>
			{
				write.write(data)	
			}, async () =>
			{
				write.write(' For real!')
			})

		await miss.pipe(read, stream)

		assert_contents('test-data.txt', 'Your heart, deep within everything you experience, is stronger than the deepest mountain, larger than the most expansive galaxy. For real!')

		fs.unlinkSync('test-data.txt')
	}, concat: async () => {
		var read = fs.createReadStream('example-data.txt')

		var contents = await miss.concat(read)

		assert_buffer(contents, 'Your heart, deep within everything you experience, is stronger than the deepest mountain, larger than the most expansive galaxy.')
	}, finished: async () => {
		var read = fs.createReadStream('example-data.txt')
		var write = fs.createWriteStream('test-data.txt')

		read.pipe(write)

		await miss.finished(write)

		assert_contents('test-data.txt', 'Your heart, deep within everything you experience, is stronger than the deepest mountain, larger than the most expansive galaxy.')

		fs.unlinkSync('test-data.txt')
		
	}, parallel: async () => {
		let string = ''
		await miss.concat(
			fs.createReadStream('example-data.txt'),
			split(' '),
			miss.parallel(5, async (word, encoding) => word.toString(encoding).toUpperCase()),
			miss.through(async word => string += word + ' ')
		)
		assert_string(string, 'YOUR HEART, DEEP WITHIN EVERYTHING YOU EXPERIENCE, IS STRONGER THAN THE DEEPEST MOUNTAIN, LARGER THAN THE MOST EXPANSIVE GALAXY. ')
	}
})

async function test(tests)
{
	for (var test in tests)
	{
		console.log(`Passing '${test}' ...`)
		await tests[test]()
	}
	console.log('All tests passed.')
	console.log('')
	console.log(fs.readFileSync('example-data.txt').toString())
	console.log('For real.')
}
