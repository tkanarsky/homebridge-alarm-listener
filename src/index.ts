import { Service, CharacteristicValue, Logger, AccessoryConfig, API } from 'homebridge';
import { Detector } from './worker';

class AlarmListenerAccessory {
  private detector: Detector;
  private infoService: Service;
  private smokeService: Service;

  constructor(
    private readonly log: Logger,
    private readonly config: AccessoryConfig,
    private readonly api: API
  ) {

    this.detector = new Detector(this.config);

    this.infoService = new this.api.hap.Service.AccessoryInformation()
      .setCharacteristic(this.api.hap.Characteristic.Manufacturer, 'Homebridge')
      .setCharacteristic(this.api.hap.Characteristic.Model, 'Alarm Listener')
      .setCharacteristic(this.api.hap.Characteristic.SerialNumber, 'SN01');
     

    this.smokeService = new this.api.hap.Service.SmokeSensor(this.config.name);
 
    // register handlers for the Smoke Detected characteristic
    this.smokeService.getCharacteristic(this.api.hap.Characteristic.SmokeDetected)
      .onGet(this.getSmokeDetected.bind(this)); 

    this.smokeService.getCharacteristic(this.api.hap.Characteristic.StatusActive)
      .onGet(this.getDetectorRunning.bind(this));

    setInterval(() => {
      this.smokeService.updateCharacteristic(
        this.api.hap.Characteristic.SmokeDetected, 
        this.detector.activated()
      );
      this.smokeService.updateCharacteristic(
        this.api.hap.Characteristic.StatusActive,
        this.detector.isRunning()
      );
      this.log.debug("Alarm activation level: ", this.detector.getActivation());
    }, 1000);
  }

  async getSmokeDetected(): Promise<CharacteristicValue> {
    return this.detector.activated();
  }

  async getDetectorRunning(): Promise<CharacteristicValue> {
    return this.detector.isRunning();
  }

  getServices(): Service[] {
    return [
      this.infoService,
      this.smokeService
    ]
  }
}

module.exports = (api: API) => {
  api.registerAccessory('HomebridgeAlarmListener', AlarmListenerAccessory);
}
