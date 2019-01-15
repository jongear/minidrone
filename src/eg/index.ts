import temporal from 'temporal'
import { Drone } from '../'

const d = new Drone(process.env.UUID)

d.connect(() => {
  d.setup(() => {
    d.flatTrim()
    d.startPing()
    d.flatTrim()
    // tslint:disable-next-line:no-console
    console.log('Connected to drone', d.name)

    temporal.queue([
      {
        delay: 5000,
        task: () => {
          // tslint:disable-next-line:no-console
          console.log('Getting ready for takeOff!')
          d.takeOff()
          d.flatTrim()
        },
      },
      {
        delay: 4500,
        task: () => {
          // tslint:disable-next-line:no-console
          console.log('Going forward')
          d.forward({ steps: 12 })
        },
      },
      {
        delay: 4500,
        task: () => {
          // tslint:disable-next-line:no-console
          console.log('Going up')
          d.up({ steps: 20 })
        },
      },
      {
        delay: 4500,
        task: () => {
          // tslint:disable-next-line:no-console
          console.log('Going down')
          d.down({ steps: 20 })
        },
      },
      {
        delay: 4500,
        task: () => {
          // tslint:disable-next-line:no-console
          console.log('Going left')
          d.tiltLeft({ steps: 12, speed: 100 })
        },
      },
      {
        delay: 4500,
        task: () => {
          // tslint:disable-next-line:no-console
          console.log('Going right')
          d.tiltRight({ steps: 12, speed: 100 })
        },
      },
      {
        delay: 5000,
        task: () => {
          // tslint:disable-next-line:no-console
          console.log('OMG Flip!')
          d.frontFlip()
        },
      },
      {
        delay: 5000,
        task: () => {
          // tslint:disable-next-line:no-console
          console.log('Time to land')
          d.land()
        },
      },
      {
        delay: 5000,
        task: () => {
          temporal.clear()
          process.exit(0)
        },
      },
    ])
  })
})
