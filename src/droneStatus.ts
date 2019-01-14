export default class DroneStatus {
  public stateValue: number = 0
  public flying: boolean = false
  public battery: number = 100

  public constructor(init?: Partial<DroneStatus>) {
    Object.assign(this, init)
  }
}
