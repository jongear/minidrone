import noble = require('noble-mac')
import { Drone } from '../'

const knownDevices = []

if (noble.state === 'poweredOn') {
  start()
} else {
  noble.on('stateChange', start)
}

function start() {
  noble.startScanning()

  noble.on('discover', peripheral => {
    if (!Drone.isDronePeripheral(peripheral)) {
      return // not a rolling spider
    }

    const details = {
      name: peripheral.advertisement.localName,
      uuid: peripheral.uuid,
      rssi: peripheral.rssi,
    }

    knownDevices.push(details)
    // tslint:disable-next-line:no-console
    console.log(
      knownDevices.length +
        ': ' +
        details.name +
        ' (' +
        details.uuid +
        '), RSSI ' +
        details.rssi
    )
  })
}
