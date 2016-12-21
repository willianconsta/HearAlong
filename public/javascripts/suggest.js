function suggest () {
  const input = document.getElementById('newVideo')
  const videoId = extractVideoId(input.value)
  console.log('Video id ', videoId)
  if (videoId == null) {
    return
  }
  input.value = ''
  return videoId
}

function extractVideoId (videoInput) {
  const httpsRegex = /https:\/\/www.youtube.com\/watch\?v=(.{11})/g
  const matchHttps = httpsRegex.exec(videoInput)
  if (matchHttps != null) {
    return matchHttps[1]
  }

  const httpRegex = /http:\/\/www.youtube.com\/watch\?v=(.{11})/g
  const httpMatch = httpRegex.exec(videoInput)
  if (httpMatch != null) {
    return httpMatch[1]
  }

  const videoIdRegex = /(.{11})/g
  const videoIdMatch = videoIdRegex.exec(videoInput)
  if (videoIdMatch != null) {
    return videoIdMatch[1]
  }

  return null
}

console.log(suggest)
