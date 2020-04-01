# mississippi-promise

This module is based off of [`require('mississippi')`](https://www.npmjs.com/package/mississippi), but offers the contents with promises instead of callbacks, and adds [split](#split), [merge](#merge), and [pull](#pull).  Like the Mississippi river, this collects together useful streaming into one location.

Learn how each part of Mississippi works, and then work with the ones you are most drawn to, while holding understanding
of the rest.  Draw from this forever flowing source of utilities, and be deeply nourished.

One central place to come to, makes working with the separate ways of streams easy, without sacrificing speed or communication.
Long ago people likely all came to the Mississippi river, with similar shared benefits.

## usage

```js
const river = require('mississippi-promise')
```

## methods

- [pipe](#pipe)
- [each](#each)
- [pipeline](#pipeline)
- [duplex](#duplex)
- [through](#through)
- [from](#from)
- [to](#to)
- [concat](#concat)
- [finished](#finished)
- [parallel](#parallel)
- [split](#split)
- [merge](#merge)
- [pull](#pull)

### pipe

##### `async river.pipe(stream1, stream2, stream3, ...)`

Pipes streams together and destroys all of them if one of them closes.  Rejects if there was an error in any of the streams.

When using standard `source.pipe(destination)` the source will _not_ be destroyed if the destination emits close or error. You are also not able to wait on a promise to tell when the pipe has finished.

`river.pipe` does these two things for you, ensuring you handle stream errors 100% of the time (unhandled errors are probably the most common bug in most node streams code)

#### original module

`river.pipe` is provided in `mississippi` by [`require('pump')`](https://www.npmjs.com/package/pump) and is wrapped by `util.promisify` in `mississippi-promise`

#### example

```js
// lets do a simple file copy
let fs = require('fs')

example()

async function example()
{
  let read = fs.createReadStream('./original.zip')
  let write = fs.createWriteStream('./copy.zip')
  
  // use river.pipe instead of read.pipe(write)
  try {
    await river.pipe(read, write)
    console.log('Copied successfully')
  } catch(error) {
    console.error('Copy error!', error)
  }
}
```

### each

##### `async river.each(stream, async each)`

Iterate the data in `stream` one chunk at a time. Your `each` function will be called with `(data)` where data is a data chunk. Resolve your returned promise when you are ready to consume the next chunk.

Optionally you can reject your promise to destroy the stream. The promise returned by `river.each` will also resolve or reject when the stream ends.

#### original module

`river.each` is provided in `mississippi` by [`require('stream-each')`](https://www.npmjs.com/package/stream-each) and is wrapped with promises in `mississippi-promise`

#### example

```js
let fs = require('fs')

example()

async function example()
{
  let newLineSeparatedNumbers = fs.createReadStream('example-data.txt')
  
  let pipeline = river.pipeline(newLineSeparatedNumbers, river.split())
  let sum = 0
  await river.each(pipeline, async line => sum += parseInt(line.toString()))
  console.log('sum is', sum)
}
```

### pipeline

##### `let pipeline = river.pipeline(stream1, stream2, stream3, ...)`

Builds a pipeline from all the transform streams passed in as arguments by piping them together and returning a single stream object that lets you write to the first stream and read from the last stream.

If you are pumping object streams together use `pipeline = river.pipeline.obj(s1, s2, ...)`.

If any of the streams in the pipeline emits an error or gets destroyed, or you destroy the stream it returns, all of the streams will be destroyed and cleaned up for you.

#### original module

`river.pipeline` is provided in `mississippi` by [`require('pumpify')`](https://www.npmjs.com/package/pumpify)

#### example

```js
// first create some transform streams (note: these two modules are fictional)
let imageResize = require('image-resizer-stream')({width: 400})
let pngOptimizer = require('png-optimizer-stream')({quality: 60})

example()

async function example()
{
  // instead of doing a.pipe(b), use pipeline
  let resizeAndOptimize = river.pipeline(imageResize, pngOptimizer)
  // `resizeAndOptimize` is a transform stream. when you write to it, it writes
  // to `imageResize`. when you read from it, it reads from `pngOptimizer`.
  // it handles piping all the streams together for you
  
  // use it like any other transform stream
  let fs = require('fs')

  let read = fs.createReadStream('./image.png')
  let write = fs.createWriteStream('./resized-and-optimized.png')

  try {
    await river.pipe(read, resizeAndOptimize, write)
    console.log('Image processed successfully')
  } catch(error) {
    console.error('Image processing error!', error)
  }
}
```

### duplex

##### `let duplex = river.duplex([writable, readable, opts])`

Take two separate streams, a writable and a readable, and turn them into a single [duplex (readable and writable) stream](https://nodejs.org/api/stream.html#stream_class_stream_duplex).

The returned stream will emit data from the readable. When you write to it it writes to the writable.

You can either choose to supply the writable and the readable at the time you create the stream, or you can do it later using the `.setWritable` and `.setReadable` methods and data written to the stream in the meantime will be buffered for you.

#### original module

`river.duplex` is provided in `mississippi` by [`require('duplexify')`](https://www.npmjs.com/package/duplexify)

#### example

```js
// lets spawn a process and take its stdout and stdin and combine them into 1 stream
let child = require('child_process')

// @- tells it to read from stdin, --data-binary sets 'raw' binary mode
let curl = child.spawn('curl -X POST --data-binary @- http://foo.com')

// duplexCurl will write to stdin and read from stdout
let duplexCurl = river.duplex(curl.stdin, curl.stdout)
```

### through

##### `let transformer = river.through([options,] [async transformFunction] [, async flushFunction])`

Make a custom [transform stream](https://nodejs.org/docs/latest/api/stream.html#stream_class_stream_transform).

The `options` object is passed to the internal transform stream and can be used to create an `objectMode` stream (or use the shortcut `river.through.obj([...])`)

The `transformFunction` is waited for when data is available for the writable side and has the signature `(chunk, encoding)`. Within the function, add data to the readable side any number of times with `this.push(data)`. Resolve to indicate processing of the `chunk` is complete. To easily emit a chunk, resolve with it.  To easily emit an error, reject it.

The `flushFunction`, is waited for just before the stream is complete and should be used to wrap up stream processing.

#### original module

`river.through` is provided by [`require('through2-promise')`](https://www.npmjs.com/package/through2-promise)

#### example

```js
let fs = require('fs')

example()

async function example()
{
  let read = fs.createReadStream('./boring_lowercase.txt')
  let write = fs.createWriteStream('./AWESOMECASE.TXT')
  
  // Leaving out the options object
  let uppercaser = river.through(
    async (chunk, enc) => chunk.toString().toUpperCase(),
    async () => 'ONE LAST BIT OF UPPERCASE'
  )
  
  try {
    await river.pipe(read, uppercaser, write)
    console.log('Splendid uppercasing!')
  } catch(error) {
    console.error('Trouble uppercasing!')
  }
}
```

### from

##### `river.from([opts], async read)`

Make a custom [readable stream](https://nodejs.org/docs/latest/api/stream.html#stream_class_stream_readable).

`opts` contains the options to pass on to the ReadableStream constructor e.g. for creating a readable object stream (or use the shortcut `river.from.obj([...])`).

Returns a readable stream that waits for `read(size)` when data is requested from the stream.

- `size` is the recommended amount of data (in bytes) to retrieve.
- resolve when you're ready to emit more data.
- reject when there is a stream error

#### original module

`river.from` is provided in `mississippi` by [`require('from2')`](https://www.npmjs.com/package/from2) and wrapped with promises in `mississippi-promise`

#### example

```js


function fromString(string) {
  return river.from(async (size) => {
    // if there's no more content
    // left in the string, close the stream.
    if (string.length <= 0) return null

    // Pull in a new chunk of text,
    // removing it from the string.
    let chunk = string.slice(0, size)
    string = string.slice(size)

    // Emit "chunk" from the stream.
    return chunk
  })
}

// pipe "hello world" out
// to stdout.
fromString('hello world').pipe(process.stdout)
```

### to

##### `river.to([options], async write, [async flush])`

Make a custom [writable stream](https://nodejs.org/docs/latest/api/stream.html#stream_class_stream_writable).

`opts` contains the options to pass on to the WritableStream constructor e.g. for creating a writable object stream (or use the shortcut `river.to.obj([...])`).

Returns a writable stream that waits for `write(data, enc)` when data is written to the stream.

- `data` is the received data to write the destination.
- `enc` encoding of the piece of data received.
- resolve when you're ready to write more data
- reject if you encountered an error.

`flush()` is waited for before `finish` is emitted and allows for cleanup steps to occur.

#### original module

`river.to` is provided in `mississippi` by [`require('flush-write-stream')`](https://www.npmjs.com/package/flush-write-stream) and wrapped with promises in `mississippi-promise`

#### example

```js
let ws = river.to(write, flush)

ws.on('finish', function () {
  console.log('finished')
})

ws.write('hello')
ws.write('world')
ws.end()

async function write (data, enc) {
  // i am your normal ._write method
  console.log('writing', data.toString())
}

async function flush () {
  // i am called before finish is emitted
  await new Promise(resolve => setTimeout(resolve, 1000)) // wait 1 sec
}
```

If you run the above it will produce the following output

```
writing hello
writing world
(nothing happens for 1 sec)
finished
```

### concat

##### `let concat = await river.concat(stream, ...);`

Returns a promise that concatenates all data read from the the passed stream[s] and resolves to the single result.

Calling `river.concat(stream, ...)` produces a pipeline with a new writable stream at the end. The returned promised is resolved when the writable stream is finished, e.g. when all data is done being written to it. The promise resolves with the result of concatenating all the data written to the stream.

If more than one stream is passed, they are piped together as in `river.pipe(stream1, ...)`

`river.concat` handles stream errors using `river.pipe`.

#### original module

`river.concat` is provided in `mississippi` by [`require('concat-stream')`](https://www.npmjs.com/package/concat-stream) and is piped and wrapped with a promise in `mississippi-promise`

#### example

```js
let fs = require('fs')

example()

async function example()
{
  let readStream = fs.createReadStream('cat.png')
  try {
    let imageBuffer = await river.concat(readStream)
    // imageBuffer is all of `cat.png` as a node.js Buffer
  } catch(error) {
    // handle your error appropriately here, e.g.:
    console.error(err) // print the error to STDERR
    process.exit(1) // exit program with non-zero exit code
  }
}
```

### finished

##### `await river.finished(stream)`

Waits for `stream` to finish or error.

This function is useful for simplifying stream handling code as it lets you handle success or error conditions in a single code path. The underpinnings are used internally in `river.pipe`.

#### original module

`river.finished` is provided in `mississippi` by [`require('end-of-stream')`](https://www.npmjs.com/package/end-of-stream) and is wrapped with `util.promisify` in `mississippi-promise`

#### example

```js
let copySource = fs.createReadStream('./movie.mp4')
let copyDest = fs.createWriteStream('./movie-copy.mp4')

copySource.pipe(copyDest)

try {
  await river.finished(copyDest)
  console.log('write success')
} catch (error) {
  return console.log('write failed', err)
}
```

### parallel

##### `river.parallel(concurrency, async each)`

This works like `through` except you can process items in parallel, while still preserving the original input order.

This is handy if you wanna take advantage of node's async I/O and process streams of items in batches. With this module you can build your very own streaming parallel job queue.

Note that `river.parallel` preserves input ordering. Passing the option `{ordered:false}` will output the data as soon as it's processed by a transform, without waiting to respect the order (this previously required a separate module [through2-concurrent](https://github.com/almost/through2-concurrent)).

#### original module

`river.parallel` is provided in `mississippi` by [`require('parallel-transform')`](https://npmjs.org/parallel-transform) and is wrapped with promises in `mississippi-promise`

#### example

This example fetches the GET HTTP headers for a stream of input URLs 5 at a time in parallel.

```js
function getResponse (item) {
  return new Promise((resolve, reject) =>
  {
    let r = request(item.url)
    r.on('error', reject)
    r.on('response', (response) => {
      resolve({url: item.url, date: new Date(), status: re.statusCode, headers: re.headers})
      r.abort()
    })
  })
}

river.pipe(
  fs.createReadStream('./urls.txt'), // one url per line
  river.split(),
  river.parallel(5, getResponse),
  river.through(function (row, enc) {
    console.log(JSON.stringify(row))
  })
)
```

### split

##### `let splitter = river.split([delimiter])`

Makes a [transform stream](https://nodejs.org/docs/latest/api/stream.html#stream_class_stream_transform) that splits a binary stream into chunks based on a delimiter.  The delimiter can be a String or a Buffer.

#### original module

`river.split` is provided by [`require('node-binary-split')`](https://www.npmjs.com/package/node-binary-split)

#### example

```js
let filestream = fs.createReadStream(file)
let pipeline = river.pipeline(filestream, river.split('\n'))

await river.each(pipeline, async line => {
  // each chunk now is a separate line!
})
```

### merge

#### `let stream = river.merge([stream(s)1], [stream(s)2], ..., [options])`

Merges multiple streams into one stream in sequence or parallel.
Passing an array of stream will merge them in parallel.  Otherwise parameters are merged in sequence.

#### original module

`river.pipeline` is provided by [`require('merge2')`](https://www.npmjs.com/package/merge2)

#### example

```js
// merge order:
//   1. merge `stream1`;
//   2. merge `stream2` and `stream3` in parallel after `stream1` merged;
//   3. merge 'stream4' after `stream2` and `stream3` merged;
const stream = merge2(stream1, [stream2, stream3], stream4)
```

### pull

#### `let part = await river.pull(stream)`

Resolves a promise to the next buffer or object in a stream's
readable queue.  Rejects if there is an error or the stream
is closed.

#### original module

`river.pull` is provided by [ require('stream-shift-promise') ](https://www.npmjs.com/package/stream-shift-promise) which is a promise wrapper around [ require('stream-shift') ](https://www.npmjs.com/package/stream-shift)

#### example

```js
console.log(await river.pull(stream)) // first item from stream
```

## see also

- [mississippi](https://github.com/maxogden/mississippi)
- [bluestream](https://github.com/bustle/bluestream)
- [substack/stream-handbook](https://github.com/substack/stream-handbook)
- [nodejs.org/api/stream.html](https://nodejs.org/api/stream.html)
- [awesome-nodejs-streams](https://github.com/thejmazz/awesome-nodejs-streams)

## license

Licensed under the BSD 2-clause license.

