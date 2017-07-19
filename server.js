const uuid = require('uuid')
const {validateGrid} = require('./src/helpers')
const Game = require('./src/game')

let games = new Map()

let userGameMap = new Map()

let io = require('socket.io')(8080)

io.on('connection', function (socket) {
  socket.emit('welcome', 'Welcome to seabattle game!')

  socket.emit('games available', Array.from(games.keys()))
  
  socket.on('disconnect', function () {
    let gameId = userGameMap.get(socket)
    if (gameId) {
      let gameData = games.get(gameId)

      if (gameData) {
        let sock = socket == gameData.socketA
            ? gameData.socketB
            : gameData.socketA

        if (sock) {
          sock.emit('info', 'Opponent disconnected!')
          userGameMap.delete(sock)
        }
        games.delete(gameId)
        userGameMap.delete(socket)
      }
    }
  })

  socket.on('create', function(grid) {
    let gameId = uuid.v4()

    userGameMap.set(socket, gameId)

    games.set(gameId, {socketA: socket, gridA: grid})
    
    socket.emit('create', {gameId})
  })

  socket.on('join', function(data) {
    if (!data || !data.gameId) {
      socket.emit('join', {error: 'gameId not specified'})

      return
    }

    if (!games.has(data.gameId)) {
      socket.emit('join', {error: 'Wrong game id'})
      return
    }

    let gameData = games.get(data.gameId)

    if (gameData.socketB) {
      socket.emit('join', {error: 'Cannot join, game in progress'})
    }
    else {
      userGameMap.set(socket, data.gameId)
      games.set(data.gameId, Object.assign(gameData, {socketB: socket,
                                                      gridB: data.grid}))

      gameData.game = new Game(gameData)

      socket.emit('join', {success: true,
                           info: 'You successfully joined the game'})

      let [a, b] = gameData.game.whoseTurn.socket === socket
          ? [true, false]
          : [false, true]

      socket.emit('start',
                  {move: a,
                   grid: gameData.game.playerB.trackingGrid})

      gameData.socketA.emit('start',
                            {move: b,
                             grid: gameData.game.playerA.trackingGrid})
    }
  })
})

module.exports = io
