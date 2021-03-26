import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { AlarmListenerAccessory } from './platformAccessory';

export class AlarmListenerPlatform implements DynamicPlatformPlugin {
  
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing alarm listener platform.');

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // initialize alarm listener after accessories are uncached
      this.initAlarmListener();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory): void {
    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  initAlarmListener(): void {

    const uuid = this.api.hap.uuid.generate('AlarmListener');
    const listener = this.accessories.find(accessory => accessory.UUID === uuid);

    if (listener) {

      this.api.updatePlatformAccessories([listener]);

      // We've already initialized the alarm listener
      this.log.info('Restoring existing alarm listener accessory');

      // create the accessory handler for the restored accessory
      // this is imported from `platformAccessory.ts`
      new AlarmListenerAccessory(this, listener);

    } else {
      // the accessory does not yet exist, so we need to create it
      this.log.info('Creating new alarm listener accessory');

      // create a new accessory
      const accessory = new this.api.platformAccessory('Alarm Listener', this.api.hap.uuid.generate('AlarmListener'));

      // create the accessory handler for the newly create accessory
      // this is imported from `platformAccessory.ts`
      new AlarmListenerAccessory(this, accessory);

      // link the accessory to your platform
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
  }
}
