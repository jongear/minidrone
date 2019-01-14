export default class DroneSteps {
  public fa0a: number = 0
  public fa0b: number = 0
  public fa0c: number = 0

  public constructor(init?: Partial<DroneSteps>) {
    Object.assign(this, init)
  }
}
