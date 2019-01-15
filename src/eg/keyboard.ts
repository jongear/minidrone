import keypress from 'keypress'
import { Drone } from '../'

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

if (process.env.UUID) {
  // tslint:disable-next-line:no-console
  console.log('Searching for ', process.env.UUID)
}

const d = new Drone()

d.connect(() => {
  d.setup(() => {
    // tslint:disable-next-line:no-console
    console.log('Configured for Rolling Spider! ', d.name)
    d.flatTrim()
    d.startPing()
    d.flatTrim()

    // d.on('battery', function () {
    //   console.log('Battery: ' + d.status.battery + '%');
    //   d.signalStrength(function (err, val) {
    //     console.log('Signal: ' + val + 'dBm');
    //   });

    // });

    // d.on('stateChange', function () {
    //   console.log(d.status.flying ? "-- flying" : "-- down");
    // })
    setTimeout(() => {
      // tslint:disable-next-line:no-console
      console.log('ready for flight')
      ACTIVE = true
    }, 1000)
  })
})

process.stdin.on('keypress', (ch, key) => {
  if (ACTIVE && key) {
    if (key.name === 'm') {
      d.emergency()
      setTimeout(() => {
        process.exit()
      }, 3000)
    } else if (key.name === 't') {
      // tslint:disable-next-line:no-console
      console.log('takeoff')
      d.takeOff()
    } else if (key.name === 'w') {
      d.forward({ steps: STEPS })
      cooldown()
    } else if (key.name === 's') {
      d.backward({ steps: STEPS })
      cooldown()
    } else if (key.name === 'left') {
      d.turnLeft({ steps: STEPS })
      cooldown()
    } else if (key.name === 'a') {
      d.tiltLeft({ steps: STEPS })
      cooldown()
    } else if (key.name === 'd') {
      d.tiltRight({ steps: STEPS })
      cooldown()
    } else if (key.name === 'right') {
      d.turnRight({ steps: STEPS })
      cooldown()
    } else if (key.name === 'up') {
      d.up({ steps: STEPS * 2.5 })
      cooldown()
    } else if (key.name === 'down') {
      d.down({ steps: STEPS * 2.5 })
      cooldown()
    } else if (key.name === 'i' || key.name === 'f') {
      d.frontFlip({ steps: STEPS })
      cooldown()
    } else if (key.name === 'j') {
      d.leftFlip({ steps: STEPS })
      cooldown()
    } else if (key.name === 'l') {
      d.rightFlip({ steps: STEPS })
      cooldown()
    } else if (key.name === 'k') {
      d.backFlip({ steps: STEPS })
      cooldown()
    } else if (key.name === 'q') {
      // tslint:disable-next-line:no-console
      console.log('Initiated Landing Sequence...')
      d.land()
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

// launch();
