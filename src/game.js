const {generateEmptyGrid,
       generateRandomGrid} = require('./helpers')


function Player(socket, grid = generateRandomGrid()) {
  this.socket = socket
  this.primaryGrid = generateEmptyGrid()
  this.trackingGrid = grid
}

Player.prototype.isHit = function({x, y}) {
  return this.trackingGrid[x][y]
}

Player.prototype.setHit = function({x, y, hit}) {
  this.primaryGrid[x][y] = hit
}

function Game({socketA, socketB, gridA, gridB}) {
  this.setEvents(socketA)
  this.setEvents(socketB)

  this.playerA = new Player(socketA, gridA)
  this.playerB = new Player(socketB, gridB)
  this.whoseTurn = Math.floor(Math.random() * 2)
      ? this.playerA
      : this.playerB
}

Game.prototype.setEvents = function(socket) {
  socket.on('turn', data => {
    this.turn(socket, data)
  })
}

Game.prototype.turn = function(socket, {x, y}) {
  if (this.whoseTurn.socket !== socket) {
    return socket.emit('turn', {error: 'It\'s not your turn!'})
  }

  let opponent = socket == this.playerA.socket
      ? this.playerB
      : this.playerA
  
  let hit = opponent.isHit({x, y})

  if (!hit) {
    this.whoseTurn = opponent
  }

  socket.emit('turn', {x, y, hit})

  opponent.setHit({x, y, hit})
  opponent.socket.emit('hit', {x, y})
}

module.exports = Game
