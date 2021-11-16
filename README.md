**[Prerequisites](#prerequisites)** | **[Getting Started](#getting-started)** | **[Drone API](#drone-api)** | **[Swarm API](#swarm-api)**

# Mini Drone for Node.js

[![GitHub Actions build status](https://github.com/jongear/minidrone/actions/workflows/main.yml/badge.svg)](https://github.com/jongear/minidrone/actions?query=branch:master) [![downloads](https://img.shields.io/npm/dt/minidrone.svg)](https://www.npmjs.com/package/minidrone) [![Contributor count](https://img.shields.io/github/contributors/jongear/minidrone.svg)](https://github.com/jongear/minidrone/graphs/contributors)

An implementation of the networking protocols (Bluetooth LE) used by the
Parrot MiniDrone - [Rolling Spider](http://www.parrot.com/usa/products/minidrone/) and [Airborne Night Drone - MACLANE](http://www.parrot.com/usa/products/airborne-night-drone/). This offers an off-the-shelf \$99 USD drone that can be controlled by JS -- yay!

## Prerequisites:

- See [noble prerequisites](https://github.com/sandeepmistry/noble#prerequisites) for your platform

To install:

```bash
npm install minidrone
```

## Getting Started

There are a few steps you should take when getting started with this. We're going to learn how to get there by building out a simple script that will take off, move forward a little, then land.

### Connecting

To connect you need to create a new `Drone` instance.

```js
const minidrone = require('minidrone')
const drone = new minidrone.Drone()
```

```js
const { Drone } = require('minidrone')
const drone = new Drone()
```

After you've created an instance you now have access to all the functionality of the drone, but there is some stuff you need to do first, namely connecting, running the setup, and starting the ping to keep it connected.

```js
const { Drone } = require('minidrone')
const drone = new Drone()

// NEW CODE BELOW HERE

drone.connect(function() {
  drone.setup(function() {
    drone.flatTrim()
    drone.startPing()
    drone.flatTrim()
    console.log('Connected to drone', drone.name)
  })
})
```

### Taking off, moving, and landing

We're now going to create a function that takes a drone and then by using a sequence of `temporal` tasks creates a timed sequence of calls to actions on the drone.

We recommend using `temporal` over a series of `setTimeout` chained calls for your sanity. Please abide by this when playing with the drone and ESPECIALLY if filing a ticket.

```js
const minidrone = require('minidrone')
const temporal = require('temporal')
const drone = new minidrone.Drone()

drone.connect(function() {
  drone.setup(function() {
    drone.flatTrim()
    drone.startPing()
    drone.flatTrim()

    temporal.queue([
      {
        delay: 5000,
        task: function() {
          drone.takeOff()
          drone.flatTrim()
        },
      },
      {
        delay: 3000,
        task: function() {
          drone.forward({ steps: 12 })
        },
      },
      {
        delay: 5000,
        task: function() {
          drone.land()
        },
      },
      {
        delay: 5000,
        task: function() {
          temporal.clear()
          process.exit(0)
        },
      },
    ])
  })
})
```

### Done!

And there you have it, you can now control your drone.

### Flying Multiple MiniDrones

[![Spider Swarm](http://img.youtube.com/vi/PLWJMR61Qs0/0.jpg)](http://www.youtube.com/watch?v=PLWJMR61Qs0)

Previous versions of the `minidrone` library required you to specify the UUID for your drone through a discover process. This has been removed in favor of just using the first BLE device that broadcasts with "RS\_" as its localname. **_If you are flying multiple minidrones or in a very populated BLE area_**, you will want to use the discovery process in order to identify specifically the drone(s) you want to control. Use the [Discovery Tool](https://github.com/voodootikigod/node-minidrone/blob/master/eg/discover.js) to get the UUID of all nearby BLE devices.

If you want to fly multiple drones at once, please use the Swarm API for that. An example of the swarm, as well as other examples, is available in the `eg/` directory. [Source Code Sample](https://github.com/voodootikigod/node-minidrone/blob/master/eg/swarm.js)

## Drone API

### Drone.createClient([options]) **or** new Drone([options])

Options

> - `uuid`: The uuid (Bluetooth UUID) or the Published Name (something like RS_XXXXXX) of the drone. Defaults to finding first announced. Can be a list of uuids that are separated by a comma (in the case of a string) or as an array of strings.
> - `logger`: The logging engine to utilize. Defaults to `debug`, but you could provide `console.log` or other similar logging system that can accept strings and output them.
> - `forceConnect`: When set to true, this will not wait for the bluetooth module to settle. This is necessary for some known use cases.

### drone.connect([callback])

Connects to the drone over BLE. `callback` is invoked when it is connected or receives an `error` if there is a problem establishing the connection.

### drone.setup([callback])

Sets up the connection to the drone and enumerate all of the services and characteristics. `callback` is invoked when setup completes or receives an `error` if there is a problem setting up the connection.

### drone.on('battery', callback)

Event that is emitted on battery change activity. Caution, battery drains pretty fast on this so this may create a high velocity of events.

### drone.takeoff(callback) **or** client.takeOff(callback)

Sets the internal `fly` state to `true`, `callback` is invoked after the drone
reports that it is hovering.

### drone.land(callback)

Sets the internal `fly` state to `false`, `callback` is invoked after the drone
reports it has landed.

### drone.up([options], [callback]) / client.down([options], [callback])

Options

> - `speed` at which the drive should occur, a number from 0 to 100 inclusive.
> - `steps` the length of steps (time) the drive should happen, a number from 0 to 100 inclusive.

Makes the drone gain or reduce altitude. `callback` is invoked after all the steps are completed.

### drone.clockwise([options], [callback]) / client.counterClockwise([options], [callback]) **or** client.turnRight([options], [callback]) / client.turnLeft([options], [callback])

Options

> - `speed` at which the rotation should occur
> - `steps` the length of steps (time) the turning should happen, a number from 0 to 100 inclusive.

Causes the drone to spin. `callback` is invoked after all the steps are completed.

### drone.forward([options], [callback]) / client.backward([options], [callback])

> - `speed` at which the drive should occur, a number from 0 to 100 inclusive.
> - `steps` the length of steps (time) the drive should happen, a number from 0 to 100 inclusive.

Controls the pitch. `callback` is invoked after all the steps are completed.

### drone.left([options], [callback]) / client.right([options], [callback]) **or** client.tiltLeft([options], [callback]) / client.tiltRight([options], [callback])

> - `speed` at which the drive should occur, a number from 0 to 100 inclusive.
> - `steps` the length of steps (time) the drive should happen, a number from 0 to 100 inclusive.

Controls the roll, which is a horizontal movement. `callback` is invoked after all the steps are completed.

### drone.frontFlip([callback])

Causes the drone to do an amazing front flip.

### drone.backFlip([callback])

Causes the drone to do an amazing back flip.

### drone.leftFlip([callback])

Causes the drone to do an amazing left flip. **DO NOT USE WITH WHEELS ON!!!**

### drone.rightFlip([callback])

Causes the drone to do an amazing right flip. **DO NOT USE WITH WHEELS ON!!!**

### drone.calibrate([callback]) **or** client.flatTrim([callback])

Resets the trim so that your drone's flight is stable. It should always be
called before taking off.

### drone.signalStrength(callback)

Obtains the signal strength as an RSSI value returned as the second parameter of the callback.

### drone.disconnect([callback])

Disconnects from the drone if it is connected.

### drone.emergancy([callback]) **or** client.emergency([callback])

Causes the drone to shut off the motors "instantly" (sometimes has to wait for other commands ahead of it to complete... not fully safe yet)

## Swarm API

If you have more than one (or ten) Rolling Spiders, you will eventually want to control them all as a single, somewhat unified swarm. This became such a common request, we made it part of the API for the RollingSpider. This will allow you to initialize a set of members, defined or otherwise, and broadcast commands to them all at once.

Common implementation boilerplate

```js
const minidrone = require('minidrone')
const swarm = new minidrone.Swarm({ timeout: 10 })

swarm.assemble()

swarm.on('assembled', function() {
  // For The Swarm!!!!!
})
```

### new Swarm(options)

Options (anything additional is passed on to individual members upon initialization)

> - `membership`: The uuid(s) or the Published Name(s) of the drone that are members of the swarm. If left empty/undefined, it will find any and all Rolling Spiders it can possibly find.
> - `timeout`: The number of seconds before closing the membership forcibly. Use this to ensure that membership enrollment doesn't last forever.
> - `forceConnect`: When set to true, this will not wait for the bluetooth module to settle. This is necessary for some known use cases.

### swarm.assemble([callback])

Initiates the swarm collection process. This will attempt to seek out bluetooth RollingSpiders that have been identified in the membership or isMember validation components and enrolls them into the swarm.

### swarm.closeMembership([callback])

Stops the open membership process and sets the swarm to active.

### swarm.at(id, [callback])

Returns (or executes provided callback) with the swarm member that has the provided `id` value for localName or UUID. Use this to issue commands to specific drones in the swarm.

### swarm.isMember(device)

Returns true if the provide device should be admitted as a member of the swarm or false if it should be ignored. Can be overridden for more complex membership definition.

### swarm.release([callback])

Releases all of the drones from the swarm.

### Broadcasted Commands e.g. swarm.takeOff([options], [callback])

All other commands for the swarm follow the command structure of an individual RollingSpider and it is broadcast to all roughly at the same time (bluetooth isn't always exact.) The signature is the same for all of the commands and passes options and a callback to the function.
