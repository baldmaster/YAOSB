const uuid = require('uuid')
const {validateGrid} = require('./src/helpers')
const Database = require('nedb-promise')
const {Game, Player} = require('./src/game')

let Games = new Map()

let io = require('socket.io')(8080)
let db = new Database({filename: './db/games', autoload: true})

const DB_ERROR = 'DB_ERROR'
const INPUT_ERROR = 'INPUT_ERROR'
const JOIN_ERROR = 'JOIN_ERROR'

async function getAvailableGames () {
  return db.find({started: true}, {'playerA.grid': 0})
}

io.on('connection', async function (socket) {
  socket.on('disconnect', function () {
  })

  socket.on('create', async function (grid, userName) {
    if (grid && !validateGrid(grid)) {
      socket.emit('create', {
        success: false,
        error: {
          code: INPUT_ERROR,
          message: 'Grid is not valid'
        }
      })

      return
    }

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

    try {
      await db.insert(gameObject)

      socket.emit('create', {
        success: true,
        gameId
      })
    } catch (e) {
      socket.emit('create', {
        success: false,
        error: {
          code: DB_ERROR,
          message: e.message
        }
      })
    }
  })

  socket.on('join', async function (data) {
    if (!data || !data.gameId) {
      socket.emit('join', {
        success: false,
        error: {
          code: INPUT_ERROR,
          message: 'gameId not specified'
        }
      })

      return
    }

    let gameData = await db.findOne({_id: data.gameId})

    if (!gameData) {
      socket.emit('join', {
        success: false,
        error: {
          code: INPUT_ERROR,
          message: 'Wrong game id'
        }
      })

      return
    }

    if (gameData.started) {
      socket.emit('join', {
        success: false,
        error: {
          code: JOIN_ERROR,
          message: 'Cannot join, game in progress'
        }
      })
    } else {
      try {
        await db.update({_id: data.gameId}, {
          $set: {
            playerB: {
              id: socket.id,
              userName: data.userName,
              grid: data.grid
            },
            started: true
          }
        })
      } catch (e) {
        socket.emit('join', {
          success: false,
          error: {
            code: DB_ERROR,
            message: e.message
          }
        })
      }

      let game = new Game(new Player(gameData.playerA.id,
                                     gameData.playerA.grid),
                          new Player(socket.id,
                                     data.grid))

      Games.set(data.gameId, game)

      socket.emit('join', {
        success: true,
        info: 'You successfully joined the game'
      })

      let [a, b] = game.whoseTurn === socket.id
          ? [true, false]
          : [false, true]

      socket.emit(
          'start',
        {success: true,
          move: a,
          grid: game.playerB.grid})

      io.of('/').connected[gameData.playerA.id].emit(
          'start',
        {success: true,
          move: b,
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
  socket.emit('games available', await getAvailableGames())
})

module.exports = io
