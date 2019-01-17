import noble = require('noble-mac')

let connectedDrone
const pingValue = 0

const Drone = function(peripheral, services, characteristics) {
  this.peripheral = peripheral
  this.services = services
  this.characteristics = characteristics
}

Drone.prototype.connect = function(cb) {
  // tslint:disable-next-line:no-console
  console.log('connecting')

  this.findCharacteristic('fb0f').notify(true)
  this.findCharacteristic('fb0e').notify(true)
  this.findCharacteristic('fb1b').notify(true)
  this.findCharacteristic('fb1c').notify(true)
  this.findCharacteristic('fd23').notify(true)
  this.findCharacteristic('fd53').notify(true)

  // tslint:disable-next-line:no-this-assignment
  const drone = this
  setTimeout(() => {
    drone
      .findCharacteristic('fa0b')
      .write(
        new Buffer([
          0x04,
          0x01,
          0x00,
          0x04,
          0x01,
          0x00,
          0x32,
          0x30,
          0x31,
          0x34,
          0x2d,
          0x31,
          0x30,
          0x2d,
          0x32,
          0x38,
          0x00,
        ]),
        true,
        error => {
          // tslint:disable-next-line:no-console
          console.log('connected')
          if (error) {
            // tslint:disable-next-line:no-console
            console.log('error connecting')
          }

          // setInterval(function() {
          //   console.log("Ping: " + pingValue);
          //   drone.findCharacteristic("fa0a").write(new Buffer([0x02,pingValue,0x02,0x00,0x02,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00]), true);
          //   pingValue++;
          // }, 500);

          setTimeout(() => {
            cb()
          }, 100)
        }
      )
  }, 100)
}

Drone.prototype.takeOff = function() {
  // tslint:disable-next-line:no-console
  console.log('Taking off... prepare for pain')

  this.findCharacteristic('fa0b').write(
    new Buffer([0x02, 0x05, 0x02, 0x00, 0x01, 0x00]),
    true
  )
  // tslint:disable-next-line:no-this-assignment
  const self = this
  setTimeout(() => {
    self
      .findCharacteristic('fa0a')
      .write(
        new Buffer([
          0x02,
          0x01,
          0x02,
          0x00,
          0x02,
          0x00,
          0x01,
          0x00,
          0x00,
          0x32,
          0x00,
          0x00,
        ]),
        true
      )
  }, 2000)
}

Drone.prototype.findCharacteristic = function(uinqiueUuidSegment) {
  const theChars = this.characteristics.filter(characteristic => {
    return characteristic.uuid.search(new RegExp(uinqiueUuidSegment)) !== -1
  })

  return theChars[0]
}

if (process.env.UUID) {
  // tslint:disable-next-line:no-console
  console.log('Looking for device with UUID: ' + process.env.UUID)

  noble.startScanning()

  noble.on('discover', peripheral => {
    if (peripheral.uuid === process.env.UUID) {
      peripheral.connect()
      peripheral.on('connect', error => {
        if (error) {
          return
        }

        peripheral.discoverAllServicesAndCharacteristics(
          (err, services, characteristics) => {
            if (err) {
              return
            }

            connectedDrone = new Drone(peripheral, services, characteristics)
            connectedDrone.connect(connectErr => {
              if (connectErr) {
                // tslint:disable-next-line:no-console
                console.log('Problem connecting')
              }

              connectedDrone.takeOff()
            })
          }
        )
      })
    }
  })
} else {
  // tslint:disable-next-line:no-console
  console.log('No UUID specified')
}
