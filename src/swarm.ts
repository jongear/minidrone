import * as Debug from 'debug'
import { EventEmitter } from 'events'
import * as util from 'util'
import { Drone } from '.'
// tslint:disable-next-line:ordered-imports
import noble = require('noble')
const debug = Debug('minidrone')

export default class Swarm extends EventEmitter {
  public targets: string[]
  public logger: any
  public ble: any = noble
  public peripherals: noble.Peripheral[]
  public members: Drone[]
  public timeout: number
  public discovering: boolean
  public active: boolean
  public forceConnect: boolean = false
  private TIMEOUT_HANDLER: NodeJS.Timeout

  /**
   * Constructs a new RollingSpider Swarm
   *
   * @param {Object} options to construct the drone with:
   *  - {String} A comma seperated list (as a string) of UUIDs or names to connect to. This could also be an array of the same items.  If this is omitted then it will add any device with the manufacturer data value for Parrot..
   *  - logger function to call if/when errors occur. If omitted then uses console#log
   * @constructor
   */
  constructor(options?) {
    super()
    this.ble = noble

    const membership = typeof options === 'string' ? options : undefined
    options = options || {}

    const potentialTargets = membership || options.membership

    this.peripherals = []
    this.members = []
    this.timeout = (options.timeout || 30) * 1000 // in seconds

    // define membership

    this.targets =
      potentialTargets && !util.isArray(potentialTargets)
        ? potentialTargets.split(',')
        : []

    this.logger = options.logger || debug // use debug instead of console.log
    this.discovering = false

    this.active = false

    // handle disconnect gracefully
    this.ble.on('warning', message => {
      this.onDisconnect()
    })
  }

  public at(id, callback) {
    this.logger('minidrone.Swarm#at')
    let found = null
    this.members.forEach(member => {
      if (member.name === id) {
        found = member
      }
    })
    if (typeof callback === 'function') {
      callback(found)
    } else {
      return found
    }
  }

  public isMember(peripheral) {
    this.logger('minidrone.Swarm#isMember')
    if (!peripheral) {
      return false
    }

    const localName = peripheral.advertisement.localName
    const manufacturer = peripheral.advertisement.manufacturerData
    if (this.targets.length === 0) {
      // handle "any" case
      const localNameMatch =
        localName &&
        (localName.indexOf('RS_') === 0 ||
          localName.indexOf('Mars_') === 0 ||
          localName.indexOf('Travis_') === 0 ||
          localName.indexOf('Maclan_') === 0 ||
          localName.indexOf('NewZ_') === 0)
      const manufacturerMatch =
        manufacturer &&
        [
          '4300cf1900090100',
          '4300cf1909090100',
          '4300cf1907090100',
          '4300cf190a090100',
        ].indexOf(manufacturer) >= 0

      // Is true for EITHER an "RS_" name OR manufacturer code.
      return localNameMatch || manufacturerMatch
    } else {
      // console.log(this.targets, localName);
      // console.log(this.targets, peripheral.uuid);
      // in target list
      return (
        this.targets.indexOf(localName) >= 0 ||
        this.targets.indexOf(peripheral.uuid) >= 0
      )
    }
  }

  public closeMembership(callback?) {
    this.logger('minidrone.Swarm#closeMembership')
    this.ble.stopScanning()
    this.discovering = false
    this.active = true
    if (callback) {
      callback()
    }
  }

  public assemble(callback?) {
    this.logger('minidrone.Swarm#assemble')

    this.once('assembled', () => {
      // when assembled clean up
      if (this.TIMEOUT_HANDLER) {
        clearTimeout(this.TIMEOUT_HANDLER)
      }
      this.closeMembership()
    })

    if (this.targets) {
      this.logger('minidrone Swarm Assemble: ' + this.targets.join(', '))
    }

    let incr = 0
    const onSetup = () => {
      incr++
      this.logger(incr + '/' + this.targets.length)
      if (this.targets.length > 0 && incr === this.targets.length) {
        this.emit('assembled')
      }
    }

    this.ble.on('discover', peripheral => {
      this.logger('minidrone.Swarm#assemble.on(discover)')

      // Is this peripheral a Parrot Rolling Spider?
      const isSwarmMember = this.isMember(peripheral)

      this.logger(
        peripheral.advertisement.localName +
          (isSwarmMember ? ' is a member' : ' is not a member')
      )
      if (isSwarmMember) {
        const swarmMember = new Drone()
        swarmMember.ble = this.ble // share the same noble instance

        swarmMember.connectPeripheral(peripheral, () => {
          this.logger(peripheral.advertisement.localName + ' is connected')
          swarmMember.setup(() => {
            this.logger(peripheral.advertisement.localName + ' is setup')
            this.members.push(swarmMember)
            swarmMember.flatTrim()
            swarmMember.startPing()
            onSetup()
          })
        })
      }
    })

    this.TIMEOUT_HANDLER = setTimeout(() => {
      this.logger('Swarm#assemble.timeout')
      this.emit('assembled')
    }, this.timeout) // timeout after 30s

    if (this.forceConnect || this.ble.state === 'poweredOn') {
      this.logger('minidrone.Swarm.forceConnect')
      this.discovering = true
      this.ble.startScanning()
    } else {
      this.logger('minidrone.on(stateChange)')
      this.ble.on('stateChange', state => {
        if (state === 'poweredOn') {
          this.logger('minidrone#poweredOn')
          this.discovering = true
          this.ble.startScanning()
          if (typeof callback === 'function') {
            callback()
          }
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

  public release(callback) {
    const max = this.members.length
    let count = 0
    for (const drone of this.members) {
      drone.disconnect(() => {
        count++
        if (count === max && callback) {
          this.members = []
          callback()
        }
      })
    }

    if (max === 0 && callback) {
      callback()
    }
  }

  public takeOff(options?, callback?) {
    this.broadcast('takeOff', options, callback)
  }

  public takeoff(options?, callback?) {
    this.takeOff(options, callback)
  }

  public land(options?, callback?) {
    this.broadcast('land', options, callback)
  }

  public emergency(options?, callback?) {
    this.broadcast('emergency', options, callback)
  }
  public emergancy(options?, callback?) {
    this.emergency(options, callback)
  }
  public cutOff(options?, callback?) {
    this.emergency(options, callback)
  }

  public wheelOff(options?, callback?) {
    this.broadcast('wheelOff', options, callback)
  }

  public wheelOn(options?, callback?) {
    this.broadcast('wheelOn', options, callback)
  }

  public toggle(options?, callback?) {
    this.broadcast('toggle', options, callback)
  }

  public flatTrim(options?, callback?) {
    this.broadcast('flatTrim', options, callback)
  }
  public calibrate(options?, callback?) {
    this.flatTrim(options, callback)
  }

  public up(options?, callback?) {
    this.broadcast('up', options, callback)
  }

  public down(options?, callback?) {
    this.broadcast('down', options, callback)
  }

  // animation
  public frontFlip(options?, callback?) {
    this.broadcast('frontFlip', options, callback)
  }
  public backFlip(options?, callback?) {
    this.broadcast('backFlip', options, callback)
  }
  public rightFlip(options?, callback?) {
    this.broadcast('rightFlip', options, callback)
  }
  public leftFlip(options?, callback?) {
    this.broadcast('leftFlip', options, callback)
  }

  // rotational
  public turnRight(options?, callback?) {
    this.broadcast('turnRight', options, callback)
  }
  public clockwise(options?, callback?) {
    this.turnRight(options, callback)
  }
  public turnLeft(options?, callback?) {
    this.broadcast('turnLeft', options, callback)
  }
  public counterClockwise(options?, callback?) {
    this.turnLeft(options, callback)
  }

  // directional
  public forward(options?, callback?) {
    this.broadcast('forward', options, callback)
  }
  public backward(options?, callback?) {
    this.broadcast('backward', options, callback)
  }
  public tiltRight(options?, callback?) {
    this.broadcast('tiltRight', options, callback)
  }
  public right(options?, callback?) {
    this.tiltRight(options, callback)
  }
  public tiltLeft(options?, callback?) {
    this.broadcast('tiltLeft', options, callback)
  }
  public left(options?, callback?) {
    this.tiltLeft(options, callback)
  }

  public hover(options?, callback?) {
    this.broadcast('hover', options, callback)
  }

  public onDisconnect() {
    // end of swarm
  }

  private broadcast(fn, opts, callback) {
    this.logger('minidrone.Swarm#broadcast-' + fn)
    if (typeof opts === 'function') {
      callback = opts
      opts = {}
    }
    const max = this.members.length
    let count = 0
    for (const drone of this.members) {
      try {
        drone[fn](opts || {}, () => {
          count++
          this.logger(fn + ': ' + count + '/' + max)
          if (count === max && callback) {
            callback()
          }
        })
      } catch (e) {
        // handle quietly
      }
    }
  }
}
