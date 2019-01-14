/**
 * Instructs the drone to start moving upward at speed
 * @param {Object} options
 * @param {float} options.speed at which the drive should occur
 * @param {float} options.steps the length of steps (time) the drive should happen
 */

export default class DroneDriveOptions {
  /**
   * @param {float} speed at which the drive should occur
   */
  public speed: number
  /**
   * @param {float} steps the length of steps (time) the drive should happen
   */
  public steps: number
}
