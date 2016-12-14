var port = 9615
var express = require('express')

var eventPort = 9672
var io = require('socket.io').listen(eventPort)

var uuid = require('node-uuid')

var queue = []
var users = []

io.on('connection', function (socket) {
  var remoteAddress = socket.handshake.headers.host || socket.request.connection.remoteAddress
  users.push(remoteAddress)

  function playNext (startTime) {
    if (queue.length > 0) {
      var nextVideo = queue[0]
      console.log('Play next video ', nextVideo, ' at ', startTime)
      var currentVideo = {
        url: nextVideo.url,
        uuid: nextVideo.uuid,
        startTime: startTime
      }
      socket.emit('playVideo', currentVideo)
      socket.broadcast.emit('playVideo', currentVideo)
      nextVideo.startedTime = nextVideo.startedTime || new Date().getTime()
    } else {
      console.log('Empty queue')
    }
  }

  socket.on('userConnected', function () {
    console.log('User connected: ', remoteAddress)
    if (queue.length > 0 && queue[0].startedTime) {
      var startTime = new Date().getTime() - queue[0].startedTime
      console.log('User ', remoteAddress, ' will listen to ', queue[0], ' starting at ', startTime)
      playNext(startTime)
    }
  })

  socket.on('suggestVideo', function (videoSuggest) {
    videoSuggest.uuid = uuid.v4()
    console.log('Video suggestion ', videoSuggest, ' from ', remoteAddress)
    queue.push(videoSuggest)
    if (queue.length === 1) {
      console.log('Queue was empty. Starting to play.')
      playNext(0)
    }
    console.log('Current queue ', queue)
  })

  socket.on('endVideo', function (video) {
    console.log('User ', remoteAddress, ' ending reproduction of video, ', video)
    setTimeout(function () {
      if (queue.length > 0) {
        if (queue[0].uuid === video.uuid) {
          console.log('Removing ', queue[0], ' from queue.')
          socket.emit('stopVideo', video)
          socket.broadcast.emit('stopVideo', video)
          queue.shift()
          setTimeout(function () {
            playNext(0)
          }, 500)
        } else {
          console.log('Video ', video.uuid, ' does not match with the first in queue ', queue[0].uuid)
        }
      } else {
        console.log('Video ', video, ' is not on the queue anymore.')
      }
    }, 2000)
  })

  socket.on('disconnect', function () {
    console.log('User ', remoteAddress, ' disconnected')
    users.splice(users.indexOf(remoteAddress), 1)
  })

  console.log('connected ', remoteAddress)
})

express()
  .use(express.static('public'))
  .get('/queue', function (req, res, next) {
    res.json(queue)
    next()
  })
  .get('/users', function (req, res, next) {
    res.json(users)
    next()
  })
  .listen(port, function () {
    console.log('Server running on ' + port + '...')
  })
