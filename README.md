# Homebridge Alarm Listener

This plugin uses your computer's microphone to listen for standard smoke detector
alarms, and publishes its findings as a HomeKit smoke sensor.

If you're running Homebridge on a Raspberry Pi, plug in a cheap USB or I2S microphone to use this plugin.

## Use Cases

- Together with HomeKit remote access (using a 
HomePod, Apple TV, or iPad as a home hub) and sensor notifications, this plugin can help notify you of a smoke detector going off when you're away from home.

- Using automations, turning on lights throughout the house whenever a smoke detector goes off at night.
  
- Triggering arbitrary Shortcuts 

## Detection

Intuitively, an alarm signal will appear as a single very prominent spike on the frequency spectrum for some extent of time.

The plugin determines the presence or absence of an alarm signal based on the prominence of a particular range of frequencies above the rest of the spectrum, together with some smoothing to distinguish a real alarm signal from short alarm chirps or other false positives.

This is implemented by periodically taking the Fourier transform of a set of microphone samples, calculating the average intensity of the target bins and the average intensity of the rest of the bins, and taking the ratio of the two. The ratio feeds an exponential smoothing model, which is then thresholded to produce a binary output.


## Configuration

Add the following to the `accessories` section of `config.json`, or use the Homebridge UI settings dialog.

```json
{
  "name": "Alarm Listener",
  "frequency": 3200,
  "tolerance": 100,
  "threshold": 1,
  "inertia": 10,
  "mic_device": "plughw:2,0",
  "accessory": "HomebridgeAlarmListener"
}
```
- `name` is the name of the accessory that this plugin will spawn.
- `frequency` is the center frequency of the alarm signal to detect. [Empirically](https://www.youtube.com/watch?v=bdVE3dvvBT0), 3200 Hz appears to be the most common siren frequency. 
- `tolerance` specifies the width of the passband. The default value of 100 Hz means that bins from 3100 to 3300 Hz are considered.
- `threshold` is the activation threshold value, which must be determined empirically (see `Tuning`)
- `inertia` is the smoothing coefficient; higher values cause the system to be slower to respond but have less false positives. The default value should be good, but feel free to tweak it.
- `mic_device` is the ALSA device name for the microphone you want to use; you most likely want to change this. You must use a `plughw`  device (to convert sample rates automatically, among other things)
  - Run `arecord -L` to get a list of all recording devices on your system.
  - https://superuser.com/questions/53957/what-do-alsa-devices-like-hw0-0-mean-how-do-i-figure-out-which-to-use
  
## Tuning Tips

The default values work with my First Alert smoke alarms and many other alarms in the video linked above, but here are some tips for increasing the sensitivity of the detector:

- Run `homebridge -D` to view the activation level of the detector in the log output. 

- Use a spectrum analyzer to determine the frequency of your alarm's siren. Set `frequency` and `tolerance` accordingly. If those are correctly set, the activation level should spike when the alarm goes off.
  - A wider tolerance results in a less sensitive detector, but it can pick up a wider range of alarm frequencies. 
  
- Set `inertia` such that the activation level stays relatively constant until the alarm turns off. If you have a more intermittent alarm signal pattern, you might need higher inertia. 

- Set `threshold` such that the activation level stays above it until the alarm turns off. This threshold depends on the loudness of the alarm and the proximity of the alarm to the microphone; a lower activation threshold means a fainter alarm can be detected but also increases the risk of false positives.

## Limitations

- The detection algorithm is fairly naive and thus isn't a one-size-fits-all solution; some configuration is needed to tune the listener to your specific alarms (see `Configuration` above).

- Some smoke alarms have the same siren frequency as carbon monoxide alarms; the current version of the plugin does not differentiate between the two.

- Some smoke alarms have a low-frequency siren -- usually 520 Hz. The low frequency square wave signal has very prominent harmonics and hence a multi-modal power spectrum; the detection algorithm assumes the alarm signal is unimodal, so it may not detect these kinds of alarms.

- Can be spoofed with a sufficiently loud recording of the alarm. Don't do anything goofy like use it to unlock doors, etc.

## Disclaimer

This is a hobby project, and is not intended to be used in any life-critical systems. This software comes without any guarantees of any kind, so don't come after me if it malfunctions and bad things happen. 


## Changelog

v2.0.0 -- moved from platform plugin to accessory plugin; added Status Active monitoring
