export default class DroneSpeed {
  public yaw: number = 0 // turn
  public pitch: number = 0 // forward/backward
  public roll: number = 0 // left/right
  public altitude: number = 0 // up/down
  public constructor(init?: Partial<DroneSpeed>) {
    Object.assign(this, init)
  }
}
