import { Drone } from '../'

const d = new Drone(process.env.UUID)

function launch() {
  d.connect(() => {
    // tslint:disable-next-line:no-console
    console.log('Prepare for take off! ', d.name)
    d.flatTrim()
    setTimeout(() => {
      // tslint:disable-next-line:no-console
      console.log('take off')
      d.takeOff()
      d.startPing()
    }, 1000)

    setTimeout(() => {
      // tslint:disable-next-line:no-console
      console.log('land')
      d.land()
    }, 6000)

    setTimeout(() => {
      // tslint:disable-next-line:no-console
      console.log('disconnect')
      d.disconnect()
    }, 10000)
  })
}

launch()

setTimeout(launch, 20000)
