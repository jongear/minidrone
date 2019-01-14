import Drone from './drone'

jest.mock('noble', () => ({
  on: jest.fn(),
}))

describe('Drone', () => {
  describe('isDronePeripheral', () => {
    it('returns false if no peripheral record', () => {
      const drone = new Drone()
      expect(drone.isDronePeripheral()).toBeFalsy()
    })

    it('returns true if peripheral.advertisement.localName begins with "RS_"', () => {
      const peripheral: any = {
        advertisement: {
          localName: 'RS_whatever',
        },
      }

      const drone = new Drone()
      expect(drone.isDronePeripheral(peripheral)).toBeTruthy()
    })

    it('returns true if peripheral.advertisement.localName begins with "Mambo_"', () => {
      const peripheral: any = {
        advertisement: {
          localName: 'Mambo_whatever',
        },
      }

      const drone = new Drone()
      expect(drone.isDronePeripheral(peripheral)).toBeTruthy()
    })

    it('returns true if peripheral.advertisement.manufacturerData is correct', () => {
      const peripheral: any = {
        advertisement: {
          manufacturerData: new Buffer([
            0x43,
            0x00,
            0xcf,
            0x19,
            0x00,
            0x09,
            0x01,
            0x00,
          ]),
        },
      }

      const drone = new Drone()
      expect(drone.isDronePeripheral(peripheral)).toBeTruthy()
    })

    it('returns true if custom name, but peripheral.advertisement.manufacturerData is correct', () => {
      const peripheral: any = {
        advertisement: {
          localName: 'ArachnaBot',
          manufacturerData: new Buffer([
            0x43,
            0x00,
            0xcf,
            0x19,
            0x00,
            0x09,
            0x01,
            0x00,
          ]),
        },
      }

      const drone = new Drone()
      expect(drone.isDronePeripheral(peripheral)).toBeTruthy()
    })
  })
})
