import keypress from 'keypress'
import { Swarm } from '../'

let ACTIVE = true
const STEPS = 2

function cooldown() {
  ACTIVE = false
  setTimeout(() => {
    ACTIVE = true
  }, STEPS * 12)
}

// make `process.stdin` begin emitting 'keypress' events
keypress(process.stdin)

// listen for the 'keypress' event

process.stdin.setRawMode(true)
process.stdin.resume()

const swarm = new Swarm({ timeout: 10 })

swarm.assemble()

swarm.on('assembled', () => {
  ACTIVE = true
})

process.stdin.on('keypress', (ch, key) => {
  if (ACTIVE && key) {
    if (key.name === 'm') {
      swarm.emergency()
      setTimeout(() => {
        process.exit()
      }, 3000)
    } else if (key.name === 't') {
      // tslint:disable-next-line:no-console
      console.log('swarm#takeoff')
      swarm.takeOff()
    } else if (key.name === 'w') {
      // tslint:disable-next-line:no-console
      console.log('swarm#forward')
      swarm.forward({ steps: STEPS })
      cooldown()
    } else if (key.name === 's') {
      // tslint:disable-next-line:no-console
      console.log('swarm#backward')
      swarm.backward({ steps: STEPS })
      cooldown()
    } else if (key.name === 'left') {
      // tslint:disable-next-line:no-console
      console.log('swarm#turnleft')
      swarm.turnLeft({ steps: STEPS })
      cooldown()
    } else if (key.name === 'a') {
      // tslint:disable-next-line:no-console
      console.log('swarm#tiltleft')
      swarm.tiltLeft({ steps: STEPS })
      cooldown()
    } else if (key.name === 'd') {
      // tslint:disable-next-line:no-console
      console.log('swarm#tiltright')
      swarm.tiltRight({ steps: STEPS })
      cooldown()
    } else if (key.name === 'right') {
      // tslint:disable-next-line:no-console
      console.log('swarm#turnright')
      swarm.turnRight({ steps: STEPS })
      cooldown()
    } else if (key.name === 'up') {
      // tslint:disable-next-line:no-console
      console.log('swarm#up')
      swarm.up({ steps: STEPS * 2.5 })
      cooldown()
    } else if (key.name === 'down') {
      // tslint:disable-next-line:no-console
      console.log('swarm#down')
      swarm.down({ steps: STEPS * 2.5 })
      cooldown()
    } else if (key.name === 'i' || key.name === 'f') {
      swarm.frontFlip({ steps: STEPS })
      cooldown()
    } else if (key.name === 'j') {
      swarm.leftFlip({ steps: STEPS })
      cooldown()
    } else if (key.name === 'l') {
      swarm.rightFlip({ steps: STEPS })
      cooldown()
    } else if (key.name === 'k') {
      swarm.backFlip({ steps: STEPS })
      cooldown()
    } else if (key.name === 'q') {
      // tslint:disable-next-line:no-console
      console.log('Initiated Landing Sequence...')
      swarm.land(() => {
        // tslint:disable-next-line:no-console
        console.log('land')
        swarm.release(() => {
          // tslint:disable-next-line:no-console
          console.log('release')
        })
      })

      //      setTimeout(function () {
      //        process.exit();
      //      }, 3000);
    }
  }
  if (key && key.ctrl && key.name === 'c') {
    process.stdin.pause()
    process.exit()
  }
})
