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

function generateRandomGrid() {
  let grid = generateEmptyGrid()

  let occupied = new Set()
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
              occupied.has(x * 10 + y)) {
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

        occupied.add(x * 10 + y)
        for (let [a, b] of HALO) {
          occupied.add((x + a) * 10 + (y + b))
        }
      }
  
      j--
    }
  }

  return grid
}

function generateVesselsMap(grid) {
  let checked = new Set()
  let vessels = new Map()
  vessels.set('bySize', new Map())

  grid.forEach((row, i) => {
    row.forEach((cell, j) => {
      if (cell == 1 && !checked.has(i * 10 + j)) {
        let ship = [[i, j]]

        for (let [x, y] of ADJACENT) {
          let [a, b] = [i + x, j + y]

          while(grid[a] && grid[a][b]) {
            ship.push([a,b])
            a += x
            b += y
          }
        }
        let size = ship.length
        let vessel = new Set()
        
        for (let [x, y] of ship) {
          let point = x * 10 + y
          vessel.add(point)
          checked.add(point)
          vessels.set(point, {size, vessel})

          for (let [a, b] of HALO) {
            checked.add((x + a) * 10 + (y + b))
          }
        }

        if (vessels.get('bySize').has(size)) {
          vessels.get('bySize').get(size).push(vessel)
        }
        else {
          vessels.get('bySize').set(size, [vessel])
        }
      }
    })
  })

  return vessels
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

  let ships = generateVesselsMap(grid).get('bySize')

  if ((!ships.get(1) || ships.get(1).length !== 4) ||
      (!ships.get(2) || ships.get(2).length !== 3) ||
      (!ships.get(3) || ships.get(3).length !== 2) ||
      (!ships.get(4) || ships.get(4).length !== 1) ||
      (Array.from(ships.keys()).find(k => k > 4))) {

    return false
  }

  return true
}

module.exports = {generateRandomGrid,
                  generateEmptyGrid,
                  generateVesselsMap,
                  validateGrid}
