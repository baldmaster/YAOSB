const {generateRandomGrid,
       generateVesselsMap} = require('./helpers')

function Player (id, grid) {
  this.id = id
  this.grid = grid || generateRandomGrid()
  this.vessels = generateVesselsMap(this.grid)
}

Player.prototype.isHit = function ({x, y}) {
  let data = {x, y}
  if (this.grid[x][y]) {
    let section = (+x) * 10 + (+y)
    let vessel = this.vessels.get(section)
    vessel.vessel.delete(section)
    this.vessels.delete(section)

    data.hit = true
    if (!vessel.vessel.size) {
      data.wreked = true
      data.size = vessel.size

      // when only 'bySize' key left
      if (this.vessels.size === 1) {
        data.win = true
      }
    }
  } else {
    data.hit = false
    data.win = false
  }

  return data
}

function Game (playerA, playerB) {
  this.playerA = playerA
  this.playerB = playerB
  this.whoseTurn = Math.floor(Math.random() * 2)
      ? playerA.id
      : playerB.id
}

Game.prototype.turn = function (playerId, {x, y}) {
  if (this.whoseTurn !== playerId) {
    return {
      error: {
        code: 'NOT_ALLOWED',
        message: 'It\'s not your turn!'
      }
    }
  }

  let opponent = playerId === this.playerA.id
      ? this.playerB
      : this.playerA

  let data = opponent.isHit({x, y})

  if (!data.hit) {
    this.whoseTurn = opponent.id
  }

  return data
}

module.exports = {Game, Player}
