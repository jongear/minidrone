import * as Debug from 'debug'
import { EventEmitter } from 'events'
import * as util from 'util'
import DroneDriveOptions from './droneDriveOptions'
import DroneSpeed from './droneSpeed'
import DroneStatus from './droneStatus'
import DroneSteps from './droneSteps'
// tslint:disable-next-line:ordered-imports
import noble = require('noble')
const debug = Debug('minidrone')

export default class Drone extends EventEmitter {
  public name: string
  public uuid: string
  public targets: string[]
  public logger: any
  public forceConnect: boolean = false
  public connected: boolean = false
  public discovered: boolean = false
  public peripheral: noble.Peripheral
  public takenOff: boolean = false
  public driveStepsRemaining: number
  public speeds: DroneSpeed
  public steps: DroneSteps
  public status: DroneStatus
  public ble: any = noble
  public characteristics: noble.Characteristic[]
  public services: noble.Service[]
  public ping: any

  /**
   * Constructs a new Mini Drone
   *
   * @param {Object} options to construct the drone with:
   *  - {String} uuid to connect to. If this is omitted then it will connect to the first device starting with 'RS_' as the local name.
   *  - logger function to call if/when errors occur. If omitted then uses console#log
   * @constructor
   */
  constructor(options?) {
    super()
    EventEmitter.call(this)

    const uuid = typeof options === 'string' ? options : undefined
    options = options || {}

    this.uuid = null
    this.targets = uuid || options.uuid

    const potentialNewTargets = uuid || options.uuid

    if (potentialNewTargets && !util.isArray(potentialNewTargets)) {
      this.targets = potentialNewTargets.split(',')
    }

    this.logger = options.logger || debug // use debug instead of console.log
    this.forceConnect = options.forceConnect || false
    this.connected = false
    this.discovered = false
    this.peripheral = null
    this.takenOff = false
    this.driveStepsRemaining = 0

    this.speeds = new DroneSpeed()
    /**
     * Used to store the 'counter' that's sent to each characteristic
     */
    this.steps = new DroneSteps()
    this.status = new DroneStatus()

    // handle disconnect gracefully
    this.ble.on('warning', message => {
      this.onDisconnect()
    })
  }

  /**
   * Drone.isDronePeripheral
   *
   * Accepts a BLE peripheral object record and returns true|false
   * if that record represents a Rolling Spider Drone or not.
   *
   * @param  {Object}  peripheral A BLE peripheral record
   * @return {Boolean}
   */
  public isDronePeripheral(peripheral?: noble.Peripheral): boolean {
    if (!peripheral) {
      return false
    }

    const localName = peripheral.advertisement.localName
    const manufacturer = peripheral.advertisement.manufacturerData
    const acceptedNames = [
      'RS_',
      'Mars_',
      'Travis_',
      'Maclan_',
      'Mambo_',
      'Blaze_',
      'Swat_',
      'NewZ_',
    ]
    const acceptedManufacturers = [
      '4300cf1900090100',
      '4300cf1909090100',
      '4300cf1907090100',
      '4300cf190a090100',
    ]

    const localNameMatch =
      localName &&
      acceptedNames.findIndex(name => {
        return localName.startsWith(name)
      }) >= 0

    const manufacturerMatch =
      manufacturer &&
      acceptedManufacturers.indexOf(manufacturer.toString('hex')) >= 0

    // Is true for EITHER a valid name prefix OR manufacturer code.
    return localNameMatch || manufacturerMatch
  }

  // create client helper function to match ar-drone
  public createClient(options) {
    return new Drone(options)
  }

  /**
   * Connects to the drone over BLE
   *
   * @param callback to be called once connected
   * @todo Make the callback be called with an error if encountered
   */
  public connect(callback) {
    this.logger('minidrone#connect')
    if (this.targets) {
      this.logger('minidrone finding: ' + this.targets.join(', '))
    }

    this.ble.on('discover', peripheral => {
      this.logger('minidrone.on(discover)')
      this.logger(peripheral)

      let isFound = false
      let connectedRun = false
      let matchType = 'Fuzzy'

      // Peripheral specific
      const localName = peripheral.advertisement.localName
      const uuid = peripheral.uuid

      // Is this peripheral a Parrot Rolling Spider?
      const isDrone = this.isDronePeripheral(peripheral)

      const onConnected = error => {
        if (connectedRun) {
          return
        } else {
          connectedRun = true
        }
        if (error) {
          if (typeof callback === 'function') {
            callback(error)
          }
        } else {
          this.logger('Connected to: ' + localName)
          this.ble.stopScanning()
          this.connected = true
          this.setup(callback)
        }
      }

      this.logger(localName)

      if (this.targets) {
        this.logger(this.targets.indexOf(uuid))
        this.logger(this.targets.indexOf(localName))
      }

      if (!this.discovered) {
        if (
          this.targets &&
          (this.targets.indexOf(uuid) >= 0 ||
            this.targets.indexOf(localName) >= 0)
        ) {
          matchType = 'Exact'
          isFound = true
        } else if (
          (typeof this.targets === 'undefined' || this.targets.length === 0) &&
          isDrone
        ) {
          isFound = true
        }

        if (isFound) {
          this.logger(
            matchType + ' match found: ' + localName + ' <' + uuid + '>'
          )
          this.connectPeripheral(peripheral, onConnected)
        }
      }
    })

    if (this.forceConnect || this.ble.state === 'poweredOn') {
      this.logger('minidrone.forceConnect')
      this.ble.startScanning()
    } else {
      this.logger('minidrone.on(stateChange)')
      this.ble.on('stateChange', state => {
        if (state === 'poweredOn') {
          this.logger('minidrone#poweredOn')
          this.ble.startScanning()
        } else {
          this.logger('stateChange == ' + state)
          this.ble.stopScanning()
          if (typeof callback === 'function') {
            callback(new Error('Error with Bluetooth Adapter, please retry'))
          }
        }
      })
    }
  }

  public connectPeripheral(
    peripheral: noble.Peripheral,
    onConnected?: (error: string) => void
  ) {
    this.discovered = true
    this.uuid = peripheral.uuid
    this.name = peripheral.advertisement.localName
    this.peripheral = peripheral
    this.ble.stopScanning()
    this.peripheral.connect(onConnected)
    this.peripheral.on('disconnect', () => {
      this.onDisconnect()
    })
  }

  /**
   * Gets a Characteristic by it's unique_uuid_segment
   *
   * @param {String} uniqueUuidSegment
   * @returns Characteristic
   */
  public getCharacteristic(uniqueUuidSegment) {
    const filtered = this.characteristics.filter(c => {
      return c.uuid.search(new RegExp(uniqueUuidSegment)) !== -1
    })

    return filtered[0]
  }

  /**
   * Writes a Buffer to a Characteristic by it's uinqueUuidSegment
   *
   * @param {String} uinqueUuidSegment
   * @param {Buffer} buffer
   */
  public writeTo(uinqueUuidSegment, buffer, callback?) {
    if (!this.characteristics) {
      const e = new Error(
        'You must have bluetooth enabled and be connected to a drone before executing a command. Please ensure Bluetooth is enabled on your machine and you are connected.'
      )
      if (callback) {
        callback(e)
      } else {
        throw e
      }
    } else {
      if (typeof callback === 'function') {
        this.getCharacteristic(uinqueUuidSegment).write(buffer, true, callback)
      } else {
        this.getCharacteristic(uinqueUuidSegment).write(buffer, true)
      }
    }
  }

  public onDisconnect() {
    if (this.connected) {
      this.logger('Disconnected from drone: ' + this.name)
      if (this.ping) {
        clearInterval(this.ping)
      }
      this.ble.removeAllListeners()
      this.connected = false
      this.discovered = false
      //
      //  CSW - Removed because we do not know if the device is flying or not, so leave state as is.
      //  var prevState = this.status.flying;
      //  this.status.flying = false;
      //  if (prevState !== this.status.flying) {
      //    this.emit('stateChange');
      //  }
      //  this.status.stateValue = 0;
      //
      this.emit('disconnected')
    }
  }

  /**
   * 'Disconnects' from the drone
   *
   * @param callback to be called once disconnected
   */
  public disconnect(callback?: any) {
    this.logger('minidrone#disconnect')

    if (this.connected) {
      this.peripheral.disconnect(() => {
        this.onDisconnect()
        if (typeof callback === 'function') {
          callback()
        }
      })
    } else {
      if (typeof callback === 'function') {
        callback()
      }
    }
  }

  /**
   * Starts sending the current speed values to the drone every 50 milliseconds
   *
   * This is only sent when the drone is in the air
   *
   * @param callback to be called once the ping is started
   */
  public startPing() {
    this.logger('minidrone#startPing')

    this.ping = setInterval(() => {
      const buffer = new Buffer(19)
      buffer.fill(0)
      buffer.writeInt16LE(2, 0)
      buffer.writeInt16LE(++this.steps.fa0a, 1)
      buffer.writeInt16LE(2, 2)
      buffer.writeInt16LE(0, 3)
      buffer.writeInt16LE(2, 4)
      buffer.writeInt16LE(0, 5)
      buffer.writeInt16LE(this.driveStepsRemaining ? 1 : 0, 6)

      buffer.writeInt16LE(this.speeds.roll, 7)
      buffer.writeInt16LE(this.speeds.pitch, 8)
      buffer.writeInt16LE(this.speeds.yaw, 9)
      buffer.writeInt16LE(this.speeds.altitude, 10)
      buffer.writeFloatLE(0, 11)

      this.writeTo('fa0a', buffer)
      if (this.driveStepsRemaining < 0) {
        // go on the last command blindly
      } else if (this.driveStepsRemaining > 1) {
        // decrement the drive chain
        this.driveStepsRemaining--
      } else {
        // reset to hover states
        this.emit('driveComplete', this.speeds)
        this.driveStepsRemaining = 0
        this.hover()
      }
    }, 50)
  }

  /**
   * Obtains the signal strength of the connected drone as a dBm metric.
   *
   * @param callback to be called once the signal strength has been identified
   */
  public signalStrength(callback) {
    this.logger('minidrone#signalStrength')
    if (this.connected) {
      this.peripheral.updateRssi(callback)
    } else {
      if (typeof callback === 'function') {
        callback(new Error('Not connected to device'))
      }
    }
  }

  public drive(parameters, steps) {
    this.logger('minidrone#drive')
    this.logger('driveStepsRemaining', this.driveStepsRemaining)
    const params = parameters || {}
    if (!this.driveStepsRemaining || steps < 0) {
      this.logger('setting state')
      // only apply when not driving currently, this causes you to exactly move -- prevents fluid
      this.driveStepsRemaining = steps || 1
      this.speeds.roll = params.tilt || 0
      this.speeds.pitch = params.forward || 0
      this.speeds.yaw = params.turn || 0
      this.speeds.altitude = params.up || 0

      this.logger(this.speeds)
      // inject into ping flow.
    }
  }

  // Operational Functions
  // Multiple use cases provided to support initial build API as well as
  // NodeCopter API and parity with the ar-drone library.

  /**
   * Instructs the drone to take off if it isn't already in the air
   */
  public takeoff(options, callback) {
    return this.takeOff(options, callback)
  }
  public takeOff(options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }
    this.logger('minidrone#takeOff')

    if (this.status.battery < 10) {
      this.logger('!!! BATTERY LEVEL TOO LOW !!!')
    }
    if (!this.status.flying) {
      this.writeTo(
        'fa0b',
        // tslint:disable-next-line:no-bitwise
        new Buffer([0x02, ++this.steps.fa0b & 0xff, 0x02, 0x00, 0x01, 0x00])
      )
      this.status.flying = true
    }

    this.on('flyingStatusChange', newStatus => {
      if (newStatus === 2) {
        if (typeof callback === 'function') {
          callback()
        }
      }
    })
  }

  /**
   * Configures the drone to fly in 'wheel on' or protected mode.
   *
   */

  public wheelOn(options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }
    this.logger('minidrone#wheelOn')
    this.writeTo(
      'fa0b',
      // tslint:disable-next-line:no-bitwise
      new Buffer([0x02, ++this.steps.fa0b & 0xff, 0x02, 0x01, 0x02, 0x00, 0x01])
    )

    if (callback) {
      callback()
    }
  }

  /**
   * Configures the drone to fly in 'wheel off' or unprotected mode.
   *
   */
  public wheelOff(options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }
    this.logger('minidrone#wheelOff')
    this.writeTo(
      'fa0b',
      // tslint:disable-next-line:no-bitwise
      new Buffer([0x02, ++this.steps.fa0b & 0xff, 0x02, 0x01, 0x02, 0x00, 0x00])
    )
    if (callback) {
      callback()
    }
  }

  /**
   * Instructs the drone to land if it's in the air.
   */

  public land(options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }
    this.logger('minidrone#land')
    if (this.status.flying) {
      this.writeTo(
        'fa0b',
        // tslint:disable-next-line:no-bitwise
        new Buffer([0x02, ++this.steps.fa0b & 0xff, 0x02, 0x00, 0x03, 0x00])
      )

      this.on('flyingStatusChange', newStatus => {
        if (newStatus === 0) {
          this.status.flying = false
          if (typeof callback === 'function') {
            callback()
          }
        }
      })
    } else {
      this.logger(
        "Calling minidrone#land when it's not in the air isn't going to do anything"
      )
      if (callback) {
        callback()
      }
    }
  }

  public toggle(options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }
    this.logger('minidrone#toggle')
    if (this.status.flying) {
      this.land(options, callback)
    } else {
      this.takeOff(options, callback)
    }
  }

  /**
   * Instructs the drone to do an emergency landing.
   */
  public emergency(options, callback) {
    return this.cutOff(options, callback)
  }
  public cutOff(options, callback?) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }
    this.logger('minidrone#cutOff')
    this.status.flying = false
    this.writeTo(
      'fa0c',
      // tslint:disable-next-line:no-bitwise
      new Buffer([0x02, ++this.steps.fa0c & 0xff, 0x02, 0x00, 0x04, 0x00]),
      callback
    )
  }

  /**
   * Instructs the drone to trim. Make sure to call this before taking off.
   */
  public calibrate(options, callback) {
    return this.flatTrim(options, callback)
  }
  public flatTrim(options?, callback?) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }
    this.logger('minidrone#flatTrim')
    this.writeTo(
      'fa0b',
      // tslint:disable-next-line:no-bitwise
      new Buffer([0x02, ++this.steps.fa0b & 0xff, 0x02, 0x00, 0x00, 0x00]),
      callback
    )
  }

  /**
   * Instructs the drone to do a front flip.
   *
   * It will only do this if it's in the air
   *
   */

  public frontFlip(options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }
    this.logger('minidrone#frontFlip')
    if (this.status.flying) {
      this.writeTo(
        'fa0b',
        new Buffer([
          0x02,
          // tslint:disable-next-line:no-bitwise
          ++this.steps.fa0b & 0xff,
          0x02,
          0x04,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
        ]),
        callback
      )
    } else {
      this.logger(
        "Calling minidrone#frontFlip when it's not in the air isn't going to do anything"
      )
      if (typeof callback === 'function') {
        callback()
      }
    }
    if (callback) {
      callback()
    }
  }

  /**
   * Instructs the drone to do a back flip.
   *
   * It will only do this if it's in the air
   *
   */

  public backFlip(options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }
    this.logger('minidrone#backFlip')
    if (this.status.flying) {
      this.writeTo(
        'fa0b',
        new Buffer([
          0x02,
          // tslint:disable-next-line:no-bitwise
          ++this.steps.fa0b & 0xff,
          0x02,
          0x04,
          0x00,
          0x00,
          0x01,
          0x00,
          0x00,
          0x00,
        ]),
        callback
      )
    } else {
      this.logger(
        "Calling minidrone#backFlip when it's not in the air isn't going to do anything"
      )
      if (typeof callback === 'function') {
        callback()
      }
    }
    if (callback) {
      callback()
    }
  }

  /**
   * Instructs the drone to do a right flip.
   *
   * It will only do this if it's in the air
   *
   */
  public rightFlip(options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }
    this.logger('minidrone#rightFlip')
    if (this.status.flying) {
      this.writeTo(
        'fa0b',
        new Buffer([
          0x02,
          // tslint:disable-next-line:no-bitwise
          ++this.steps.fa0b & 0xff,
          0x02,
          0x04,
          0x00,
          0x00,
          0x02,
          0x00,
          0x00,
          0x00,
        ]),
        callback
      )
    } else {
      this.logger(
        "Calling minidrone#rightFlip when it's not in the air isn't going to do anything"
      )
      if (typeof callback === 'function') {
        callback()
      }
    }

    if (callback) {
      callback()
    }
  }

  /**
   * Instructs the drone to do a left flip.
   *
   * It will only do this if it's in the air
   *
   */

  public leftFlip(options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }
    this.logger('minidrone#leftFlip')
    if (this.status.flying) {
      this.writeTo(
        'fa0b',
        new Buffer([
          0x02,
          // tslint:disable-next-line:no-bitwise
          ++this.steps.fa0b & 0xff,
          0x02,
          0x04,
          0x00,
          0x00,
          0x03,
          0x00,
          0x00,
          0x00,
        ]),
        callback
      )
    } else {
      this.logger(
        "Calling minidrone#leftFlip when it's not in the air isn't going to do anything"
      )
      if (typeof callback === 'function') {
        callback()
      }
    }
    if (callback) {
      callback()
    }
  }

  /**
   * Instructs the drone to start moving upward at speed
   *
   * @param {Object} options
   * @param {float} options.speed at which the drive should occur
   * @param {float} options.steps the length of steps (time) the drive should happen
   */
  public up(options: DroneDriveOptions, callback: any) {
    this.driveBuilder(
      {
        name: 'up',
        parameterToChange: 'up',
      },
      options,
      callback
    )
  }

  /**
   * Instructs the drone to start moving downward at speed
   *
   * @param {Object} options
   * @param {float} options.speed at which the drive should occur
   * @param {float} options.steps the length of steps (time) the drive should happen
   */
  public down(options: DroneDriveOptions, callback: any) {
    this.driveBuilder(
      {
        name: 'down',
        parameterToChange: 'up',
        scaleFactor: -1,
      },
      options,
      callback
    )
  }

  /**
   * Instructs the drone to start moving forward at speed
   *
   * @param {Object} options
   * @param {float} options.speed at which the drive should occur. 0-100 values.
   * @param {float} options.steps the length of steps (time) the drive should happen
   */
  public forward(options: DroneDriveOptions, callback: any) {
    return this.driveBuilder(
      {
        name: 'forward',
        parameterToChange: 'forward',
      },
      options,
      callback
    )
  }

  /**
   * Instructs the drone to start moving backward at speed
   *
   * @param {Object}
   * @param {float} options.speed at which the drive should occur
   * @param {float} options.steps the length of steps (time) the drive should happen
   */
  public backward(options: DroneDriveOptions, callback: any) {
    this.driveBuilder(
      {
        name: 'backward',
        parameterToChange: 'forward',
        scaleFactor: -1,
      },
      options,
      callback
    )
  }

  public clockwise(options: DroneDriveOptions, callback: any) {
    this.turnRight(options, callback)
  }
  /**
   * Instructs the drone to start spinning clockwise at speed
   *
   * @param {Object}
   * @param {float} options.speed at which the drive should occur
   * @param {float} options.steps the length of steps (time) the drive should happen
   */
  public turnRight(options: DroneDriveOptions, callback: any) {
    this.driveBuilder(
      {
        name: 'turnRight',
        parameterToChange: 'turn',
      },
      options,
      callback
    )
  }

  public counterClockwise(options: DroneDriveOptions, callback: any) {
    this.turnLeft(options, callback)
  }
  /**
   * Instructs the drone to start spinning counter-clockwise at speed
   *
   * @param {Object}
   * @param {float} options.speed at which the drive should occur
   * @param {float} options.steps the length of steps (time) the drive should happen
   */
  public turnLeft(options: DroneDriveOptions, callback: any) {
    this.driveBuilder(
      {
        name: 'turnLeft',
        parameterToChange: 'turn',
        scaleFactor: -1,
      },
      options,
      callback
    )
  }

  /**
   * Instructs the drone to start moving right at speed
   *
   * @param {Object}
   * @param {float} options.speed at which the drive should occur
   * @param {float} options.steps the length of steps (time) the drive should happen
   */
  public tiltRight(options: DroneDriveOptions, callback: any) {
    this.driveBuilder(
      {
        name: 'tiltRight',
        parameterToChange: 'tilt',
      },
      options,
      callback
    )
  }

  /**
   * Instructs the drone to start moving left at speed
   *
   * @param {Object}
   * @param {float} options.speed at which the drive should occur
   * @param {float} options.steps the length of steps (time) the drive should happen
   */
  public tiltLeft(options: DroneDriveOptions, callback: any) {
    this.driveBuilder(
      {
        name: 'tiltLeft',
        parameterToChange: 'tilt',
        scaleFactor: -1,
      },
      options,
      callback
    )
  }

  public hover(options?: any, callback?: any) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }
    // this.logger('minidrone#hover');
    this.driveStepsRemaining = 0
    this.speeds.roll = 0
    this.speeds.pitch = 0
    this.speeds.yaw = 0
    this.speeds.altitude = 0
    if (callback) {
      callback()
    }
  }

  /**
   * Gets the Bluetooth name of the drone
   * @returns {string}
   */
  public getDroneName() {
    return this.peripheral.advertisement.localName
  }

  /**
   * Sets up the connection to the drone and enumerate all of the services and characteristics.
   *
   *
   * @param callback to be called once set up
   */
  public setup(callback?) {
    this.logger('minidrone#setup')
    this.peripheral.discoverAllServicesAndCharacteristics(
      (error, services, characteristics) => {
        if (error) {
          if (typeof callback === 'function') {
            callback(error)
          }
        } else {
          this.services = services
          this.characteristics = characteristics

          this.handshake(callback)
        }
      }
    )
  }

  /**
   * Performs necessary handshake to initiate communication with the device. Also configures all notification handlers.
   *
   *
   * @param callback to be called once set up
   */
  private handshake(callback?) {
    this.logger('minidrone#handshake')
    ;[
      'fb0f',
      'fb0e',
      'fb1b',
      'fb1c',
      'fd22',
      'fd23',
      'fd24',
      'fd52',
      'fd53',
      'fd54',
    ].forEach(key => {
      const characteristic = this.getCharacteristic(key)
      characteristic.notify(true)
    })

    // Register listener for battery notifications.
    this.getCharacteristic('fb0f').on('data', (data, isNotification) => {
      if (!isNotification) {
        return
      }
      this.status.battery = data[data.length - 1]
      this.emit('battery')
      this.logger('Battery level: ' + this.status.battery + '%')
    })

    /**
     * Flying statuses:
     *
     * 0: Landed
     * 1: Taking off
     * 2: Hovering
     * 3: ??
     * 4: Landing
     * 5: Emergency / Cut out
     */
    this.getCharacteristic('fb0e').on('data', (data, isNotification) => {
      if (!isNotification) {
        return
      }
      if (data[2] !== 2) {
        return
      }

      const prevState = this.status.flying,
        prevFlyingStatus = this.status.stateValue

      this.logger('Flying status: ' + data[6])
      if ([1, 2, 3, 4].indexOf(data[6]) >= 0) {
        this.status.flying = true
      }

      this.status.stateValue = data[6]

      if (prevState !== this.status.flying) {
        this.emit('stateChange')
      }

      if (prevFlyingStatus !== this.status.stateValue) {
        this.emit('flyingStatusChange', this.status.stateValue)
      }
    })

    setTimeout(() => {
      this.writeTo(
        'fa0b',
        new Buffer([
          0x04,
          ++this.steps.fa0b,
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
        error => {
          setTimeout(() => {
            if (typeof callback === 'function') {
              callback(error)
            }
          }, 100)
        }
      )
    }, 100)
  }

  /**
   * Checks whether a speed is valid or not
   *
   * @private
   * @param {float} speed
   * @returns {boolean}
   */
  private validSpeed(speed) {
    return 0 <= speed && speed <= 100
  }

  private isObject(value) {
    return value && typeof value === 'object' && value.constructor === Object
  }

  private driveBuilder(parameters, possibleOptions, possibleCallback) {
    const name = parameters.name,
      parameterToChange = parameters.parameterToChange
    let scaleFactor = parameters.scaleFactor

    scaleFactor = scaleFactor || 1

    let options, callback
    if (this.isObject(possibleOptions)) {
      options = possibleOptions
      callback =
        typeof possibleCallback === 'function' ? possibleCallback : undefined
    } else if (typeof possibleOptions === 'function') {
      callback = possibleOptions
    } else {
      callback = undefined
    }

    this.logger('minidrone#' + name)
    if (this.status.flying) {
      options = options || {}
      const speed = options.speed || 50
      const steps = options.steps || 50
      if (!this.validSpeed(speed)) {
        this.logger(
          'minidrone#' + name + 'was called with an invalid speed: ' + speed
        )
        callback()
      } else {
        const driveParams = {}
        driveParams[parameterToChange] = speed * scaleFactor
        this.drive(driveParams, steps)
        this.once('driveComplete', callback)
      }
    } else {
      this.logger(
        'minidrone#' +
          name +
          " when it's not in the air isn't going to do anything"
      )
      callback()
    }
  }
}
