const river = require('..')
let fs = require('fs')

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
	let data1 = fs.readFileSync(path1)
	if (!(data1.equals(Buffer.from(string2, 'binary')))) {
		throw new Error(`${path1} containing '${data1.toString('binary')}' differs from '${string2}'`)
	}
}

process.chdir('test')
test({
	pipe: async () => {
		let read = fs.createReadStream('example-data.txt')
		let write = fs.createWriteStream('test-data.txt')

		await river.pipe(read, write)

		assert_contents('test-data.txt', 'Your heart, deep within everything you experience, is stronger than the deepest mountain, larger than the most expansive galaxy.')

		fs.unlinkSync('test-data.txt')
	}, each_and_split: async () => {
		let spaceSeparatedSentence = fs.createReadStream('example-data.txt')

		let pipeline = river.pipeline(spaceSeparatedSentence, river.split(' '))
		
		let array = []
		await river.each(pipeline, async word => array.push(word))

		assert_string(array.join(' '), 'Your heart, deep within everything you experience, is stronger than the deepest mountain, larger than the most expansive galaxy.')
	}, through: async () => {
		let read = fs.createReadStream('example-data.txt')
		let write = fs.createWriteStream('test-data.txt')

		let uppercaser = river.through(
			async (chunk, enc) => chunk.toString(enc).toUpperCase(),
			async () => ' FOR REAL!'
		)

		await river.pipe(read, uppercaser, write)

		assert_contents('test-data.txt', 'YOUR HEART, DEEP WITHIN EVERYTHING YOU EXPERIENCE, IS STRONGER THAN THE DEEPEST MOUNTAIN, LARGER THAN THE MOST EXPANSIVE GALAXY. FOR REAL!')

		fs.unlinkSync('test-data.txt')
	}, from: async () => {
		let string = fs.readFileSync('example-data.txt')
		let stream = river.from(async size => {
			if (string.length <= 0) { return null }

			let chunk = string.slice(0, size)
			string = string.slice(size)

			return chunk
		})

		await river.pipe(stream, fs.createWriteStream('test-data.txt'))

		assert_contents('test-data.txt', 'Your heart, deep within everything you experience, is stronger than the deepest mountain, larger than the most expansive galaxy.')

		fs.unlinkSync('test-data.txt')
	}, to: async () => {
		let read = fs.createReadStream('example-data.txt')
		let write = fs.createWriteStream('test-data.txt')

		let stream = river.to(
			async (data) =>
			{
				write.write(data)	
			}, async () =>
			{
				write.write(' For real!')
				write.end()
				await river.finished(write)
			})

		await river.pipe(read, stream)

		assert_contents('test-data.txt', 'Your heart, deep within everything you experience, is stronger than the deepest mountain, larger than the most expansive galaxy. For real!')

		fs.unlinkSync('test-data.txt')
	}, concat: async () => {
		let read = fs.createReadStream('example-data.txt')

		let contents = await river.concat(read)

		assert_buffer(contents, 'Your heart, deep within everything you experience, is stronger than the deepest mountain, larger than the most expansive galaxy.')
	}, finished: async () => {
		let read = fs.createReadStream('example-data.txt')
		let write = fs.createWriteStream('test-data.txt')

		read.pipe(write)

		await river.finished(write)

		assert_contents('test-data.txt', 'Your heart, deep within everything you experience, is stronger than the deepest mountain, larger than the most expansive galaxy.')

		fs.unlinkSync('test-data.txt')
		
	}, parallel: async () => {
		let string = ''
		await river.concat(
			fs.createReadStream('example-data.txt'),
			river.split(' '),
			river.parallel(5, async (word, encoding) => word.toString(encoding).toUpperCase()),
			river.through(async word => string += word + ' ')
		)
		assert_string(string, 'YOUR HEART, DEEP WITHIN EVERYTHING YOU EXPERIENCE, IS STRONGER THAN THE DEEPEST MOUNTAIN, LARGER THAN THE MOST EXPANSIVE GALAXY. ')
	}, merge: async () => {
		let read1 = fs.createReadStream('example-data.txt')
		let read2 = fs.createReadStream('example-data.txt')
		
		let merged = river.merge(read1, read2)
		let contents = await river.concat(merged)

		assert_buffer(contents, 'Your heart, deep within everything you experience, is stronger than the deepest mountain, larger than the most expansive galaxy.Your heart, deep within everything you experience, is stronger than the deepest mountain, larger than the most expansive galaxy.')
	}
})

async function test(tests)
{
	for (let test in tests)
	{
		console.log(`Passing '${test}' ...`)
		await tests[test]()
	}
	console.log('All tests passed.')
	console.log('')
	console.log(fs.readFileSync('example-data.txt').toString())
	console.log('')
	console.log('For real.')
}
