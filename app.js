var port = 9615
var express = require('express')
var dns = require('dns')

var eventPort = 9672
var io = require('socket.io').listen(eventPort)

var uuid = require('node-uuid')

var queue = []
var users = []

io.on('connection', function (socket) {
  var user = {
    id: uuid.v4(),
    ip: socket.request.connection.remoteAddress,
    hostname: null,
    showName: socket.request.connection.remoteAddress
  }
  users.push(user)

  function playNext (startTime) {
    if (queue.length > 0) {
      var nextVideo = queue[0]
      console.log('Play next video ', nextVideo, ' at ', startTime)
      var currentVideo = {
        url: nextVideo.url,
        title: nextVideo.title,
        uuid: nextVideo.uuid,
        startTime: startTime,
        user: nextVideo.user
      }
      socket.emit('playVideo', currentVideo)
      io.emit('playVideo', currentVideo)
      nextVideo.startedTime = nextVideo.startedTime || new Date().getTime()
    } else {
      console.log('Empty queue')
    }
  }

  socket.on('userConnected', function () {
    console.log('User connected: ', user)
    if (queue.length > 0 && queue[0].startedTime) {
      var startTime = new Date().getTime() - queue[0].startedTime
      console.log('User ', user, ' will listen to ', queue[0], ' starting at ', startTime)
      playNext(startTime)
    }
    io.emit('usersChanged')
  })

  socket.on('userName', function (userName) {
    console.log('User ', user.hostname, ' (', user.ip, ') is named ' + userName)
    const userNames = users.map(function (user) {
      return user.showName
    })
    if (userNames.indexOf(userName) !== -1) {
      userName += '/' + (user.hostname || user.ip)
    }
    user.name = userName
    user.showName = userName
  })

  socket.on('suggestVideo', function (videoSuggest) {
    videoSuggest.uuid = uuid.v4()
    console.log('Video suggestion ', videoSuggest, ' from ', user)
    queue.push({
      url: videoSuggest.url,
      title: videoSuggest.title,
      user: user,
      uuid: videoSuggest.uuid
    })
    if (queue.length === 1) {
      console.log('Queue was empty. Starting to play.')
      playNext(0)
    }
    console.log('Current queue ', queue)
  })

  socket.on('endVideo', function (video) {
    console.log('User ', user, ' ending reproduction of video, ', video)
    setTimeout(function () {
      if (queue.length > 0) {
        if (queue[0].uuid === video.uuid) {
          console.log('Removing ', queue[0], ' from queue.')
          socket.emit('stopVideo', video)
          io.emit('stopVideo', video)
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

  socket.on('skipVideo', function (video) {
    console.log('User ', user, ' skipping reproduction of video, ', video)
    setTimeout(function () {
      if (queue.length > 0) {
        if (queue[0].uuid === video.uuid) {
          console.log('Removing ', queue[0], ' from queue.')
          socket.emit('skipVideo', video, user)
          io.emit('skipVideo', video, user)
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
    console.log('User ', user, ' disconnected')
    remove(users, user)
    io.emit('usersChanged')
  })

  console.log('connected ', user)
  io.emit('usersChanged')

  dns.lookupService(user.ip, 0, function (err, hostname) {
    if (err) {
      console.error(err)
      return
    }
    user.hostname = hostname
    if (user.showName === user.ip) {
      user.showName = user.hostname
    }
    io.emit('usersChanged')
  })
})

express()
  .use(express.static('public'))
  .get('/queue', function (req, res, next) {
    res.json({ queue: queue.slice(1, 10), size: queue.length - 1 })
    next()
  })
  .get('/users', function (req, res, next) {
    res.json(users)
    next()
  })
  .listen(port, function () {
    console.log('Server running on ' + port + '...')
  })

function remove (array, object) {
  array.splice(array.indexOf(object), 1)
}
