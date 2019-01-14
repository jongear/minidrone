import Swarm from './Swarm'

jest.mock('noble', () => ({
  on: jest.fn(),
}))

describe('Swarm', () => {
  describe('release', () => {
    it('if no members, callback is still called', () => {
      const cb = jest.fn()
      const swarm = new Swarm()
      swarm.release(cb)
      expect(cb).toHaveBeenCalled()
    })
  })
})
