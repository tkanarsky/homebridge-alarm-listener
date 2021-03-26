import numjs = require('numjs');
import mic = require('mic');
import { AlarmListenerPlatform } from './platform';

export class Detector {

    activation: number;
    sampling_rate: number;

    constructor(
        private readonly platform: AlarmListenerPlatform,
    ) {
        this.activation = NaN;
        this.sampling_rate = 16000;
        const microphone = mic({
            rate: this.sampling_rate.toString(),
            device: this.platform.config.mic_device,
            channels: '1',
            encoding: 'signed-integer',
            bitwidth: 16,
            endian: 'little',
            debug: true
        });
        const mic_stream = microphone.getAudioStream();
        microphone.start();
        mic_stream.on('data', data => this.process(data));
    }

    process(data: Buffer) {
        const data_array = numjs.array([...data]);
        const fft_array = numjs.stack([data_array, numjs.zeros(data_array.shape)], -1);
        const bins_complex = numjs.fft(fft_array);

        const reals = bins_complex.slice(null, [0,1]).flatten();
        const imags = bins_complex.slice(null, [1,2]).flatten();
        const mirrored_bins = numjs.sqrt(numjs.add(numjs.multiply(reals, reals), numjs.multiply(imags, imags)));
        const bins = mirrored_bins.slice([Math.floor(mirrored_bins.shape[0] / 2)]);
           
        const lower_idx = Math.round((bins.shape[0]) * (this.platform.config.frequency - this.platform.config.tolerance) / this.sampling_rate);
        const upper_idx = Math.round((bins.shape[0]) * (this.platform.config.frequency + this.platform.config.tolerance) / this.sampling_rate);

        const target_mean = numjs.mean(bins.slice([lower_idx, upper_idx]));
        const other_mean = numjs.mean(bins.slice([lower_idx])) + numjs.mean(bins.slice(upper_idx));

        const ratio = target_mean / other_mean;

        if (isNaN(this.activation)) this.activation = ratio;
        else {
            const inertia_constant = (this.sampling_rate / bins.shape[0]) * this.platform.config.inertia;
            this.activation -= this.activation / inertia_constant;
            this.activation += ratio / inertia_constant;
        }
    }

    activated() {
        return this.activation >= this.platform.config.threshold;
    }

    getActivation() {
        return this.activation;
    }
}