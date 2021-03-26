import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { AlarmListenerPlatform } from './platform';
import { Detector } from './worker';

export class AlarmListenerAccessory {
  private service: Service;
  private detector: Detector;

  constructor(
    private readonly platform: AlarmListenerPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.detector = new Detector(this.platform);

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Homebridge')
      .setCharacteristic(this.platform.Characteristic.Model, 'Alarm Listener')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'SN01');

    this.service = this.accessory.getService(this.platform.Service.SmokeSensor) || this.accessory.addService(this.platform.Service.SmokeSensor);

    this.service.setCharacteristic(this.platform.Characteristic.Name, 'Alarm Listener');
 
    // register handlers for the Smoke Detected characteristic
    this.service.getCharacteristic(this.platform.Characteristic.SmokeDetected)
      .onGet(this.getSmokeDetected.bind(this)); 

    setInterval(() => {
      this.service.updateCharacteristic(this.platform.Characteristic.SmokeDetected, this.detector.activated());
      this.platform.log.debug("Alarm activation level: ", this.detector.getActivation());
    }, 1000);
  }

  async getSmokeDetected(): Promise<CharacteristicValue> {
    return this.detector.activated();
  }

}
