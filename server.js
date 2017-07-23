const uuid = require('uuid')
const {validateGrid} = require('./src/helpers')
const Database = require('nedb-promise')
const {Game, Player} = require('./src/game')

let Games = new Map()

let io = require('socket.io')(8080)
let db = new Database({filename: './db/games', autoload: true})

async function getAvailableGames () {
  return db.find({}, {'playerA.grid': 0})
}

io.on('connection', async function (socket) {
  socket.on('disconnect', function () {

  })

  socket.on('create', async function (grid, userName) {
    let gameId = uuid.v4()

    let gameObject = {
      _id: gameId,
      playerA: {
        id: socket.id,
        grid,
        userName
      },
      createdAt: Date.now()
    }

    let game = await db.insert(gameObject)

    socket.emit('create', {gameId})
  })

  socket.on('join', async function (data) {
    if (!data || !data.gameId) {
      socket.emit('join', {error: 'gameId not specified'})

      return
    }

    let gameData = await db.findOne({_id: data.gameId})

    if (!gameData) {
      socket.emit('join', {error: 'Wrong game id'})
      return
    }

    if (gameData.started) {
      socket.emit('join', {error: 'Cannot join, game in progress'})
    } else {
      let updateData = {
        playerB: {
          id: socket.id,
          grid: data.grid,
          userName: data.userName
        },
        started: true
      }

      let game = new Game(new Player(gameData.playerA.id,
                                     gameData.playerA.grid),
                          new Player(socket.id,
                                     data.grid))

      Games.set(data.gameId, game)

      socket.emit('join', {success: true, info: 'You successfully joined the game'})

      let [a, b] = game.whoseTurn === socket.id
          ? [true, false]
          : [false, true]

      socket.emit('start',
        {move: a,
         grid: game.playerB.grid})

      io.of('/').connected[gameData.playerA.id].emit(
          'start',
        {move: b,
         grid: game.playerA.grid})
    }
  })

  socket.on('turn', function (data) {
    let game = Games.get(data.gameId)

    if (!game) {
      socket.emit('turn', {error: 'Game not exists'})
    }

    let resp = game.turn(socket.id, data)

    socket.emit('turn', resp)
  })

  socket.emit('welcome', 'Welcome to seabattle game!')
  socket.emit('Games available', await getAvailableGames())
})

module.exports = io
