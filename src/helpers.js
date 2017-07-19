function generateEmptyGrid() {
  let grid = Array(10).fill()

  for (let i in grid) {
    let cells = Array(10).fill()
    cells.forEach((cell, j) => {
      cells[j] = 0
    })
    grid[i] = cells
  }

  return grid
}

const ADJACENT = [[-1, 0],
                  [0, -1],
                  [0, 1],
                  [1, 0]]

const HALO = [[-1, 0],
              [-1, -1],
              [-1, 1],
              [0, -1],
              [0, 1],
              [1, 0],
              [1, -1],
              [1, 1]]

function generateVessels(ships) {
  let vessels = new Map()

  for (let [k, v] of ships) {
    v.forEach(ship => {
      let s = new Set()
      let data = {size: k,
                  sections: s}
      ship.forEach(([x, y]) => {
        let key = x * 10 + y
        s.add(key)
        vessels.set(key, data)
      })
    })
  }

  return vessels
}

function generateRandomGrid() {
  let grid = generateEmptyGrid()

  let occupied = new Set()
  let ships    = new Map()
  for (let [i, j] of [[4, 1], [3, 2], [2, 3], [1, 4]]) {
    let settled = false
    while (j) {
      settled = false
      let dir = Math.floor(Math.random() * 2)
      let sig = Math.floor(Math.random() * 2) ? 1 : -1
      let points = []

      do {
        points = []
        let [xDir, yDir] = dir ? [0, sig] : [sig, 0]
        
        let x = Math.floor(Math.random() * 10)
        let y = Math.floor(Math.random() * 10)

        for (let n = 0; n < i; n++) {
          x += xDir
          y += yDir
          if (x < 0 ||
              x > 9 ||
              y < 0 ||
              y > 9 ||
              occupied.has(`${x}:${y}`)) {
            break
          }

          points.push([x, y])
          
          if (n + 1 == i) {
            settled = true
          }
        }
      } while (!settled)

      for (let [x, y] of points) {
        grid[x][y] = 1

        occupied.add(`${x}:${y}`)
        for (let [a, b] of HALO) {
          occupied.add(`${x + a}:${y + b}`)
        }
      }

      let len = points.length

      if (ships.has(len)) {
        let vessels = ships.get(len)
        ships.set(len, vessels.push(points) && vessels)
      }
      else {
        ships.set(len, [points])
      }
      
      j--
    }
  }

  let vessels = generateVessels(ships)

  return grid
}

function validateGrid(grid) {
  if (!grid instanceof Array || grid.length !== 10) {
    return false
  }

  if (grid.some(row => {
    return !row instanceof Array || row.length !== 10
  })) {
    return false
  }

  let checked = new Set()
  let ships = new Map()
  grid.forEach((row, i) => {
    row.forEach((cell, j) => {
      if (cell == 1 && !checked.has(`${i}:${j}`)) {
        let ship = [[i, j]]

        for (let [x, y] of ADJACENT) {
          let [a, b] = [i + x, j + y]

          while(grid[a] && grid[a][b]) {
            ship.push([a,b])
            a += x
            b += y
          }
        }

        for (let [x, y] of ship) {
          checked.add(`${x}:${y}`)
        
          for (let [a, b] of HALO) {
            checked.add(`${x + a}:${y + b}`)
          }
        }

        let len = ship.length

        if (ships.has(len)) {
          let vessels = ships.get(len)
          ships.set(len, vessels.push(ship) && vessels)
        }
        else {
          ships.set(len, [ship])
        }
      }
    })
  })

  if ((!ships.get(1) || ships.get(1).length !== 4) ||
      (!ships.get(2) || ships.get(2).length !== 3) ||
      (!ships.get(3) || ships.get(3).length !== 2) ||
      (!ships.get(4) || ships.get(4).length !== 1)) {
    return false
  }

  let vessels = generateVessels(ships)

  return {
    grid,
    vessels
  }
}

module.exports = {generateRandomGrid,
                  generateEmptyGrid,
                  validateGrid}
