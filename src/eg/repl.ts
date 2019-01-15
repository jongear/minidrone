import * as repl from 'repl'
import { Drone } from '../'

if (process.env.UUID) {
  const d = new Drone(process.env.UUID)
  d.connect(() => {
    d.setup(() => {
      d.startPing()

      const replServer = repl.start({
        prompt: 'Drone (' + d.uuid + ') > ',
      })

      replServer.context.drone = d

      replServer.on('exit', () => {
        d.land()
        process.exit()
      })
    })
  })
}
