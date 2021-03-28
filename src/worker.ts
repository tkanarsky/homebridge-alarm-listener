import numjs = require('numjs');
import mic = require('mic');
import { AccessoryConfig } from 'homebridge';

export class Detector {

    activation: number;
    sampling_rate: number;
    running: boolean;
    microphone: any;

    constructor(
        private readonly config: AccessoryConfig,
    ) {
        this.activation = NaN;
        this.running = false;
        this.sampling_rate = 16000;
        this.microphone = mic({
            rate: this.sampling_rate.toString(),
            device: this.config.mic_device,
            channels: '1',
            encoding: 'signed-integer',
            bitwidth: 16,
            endian: 'little',
            debug: true
        });
        const mic_stream = this.microphone.getAudioStream();
        mic_stream.on('startComplete', () => {this.running = true; });
        mic_stream.on('error', () => {this.running = false; });
        mic_stream.on('processExitComplete', () => {this.running = false; });
        mic_stream.on('data', data => this.process(data));

        this.microphone.start();
    }

    process(data: Buffer): void {
        const data_array = numjs.array([...data]);
        const fft_array = numjs.stack([data_array, numjs.zeros(data_array.shape)], -1);
        const bins_complex = numjs.fft(fft_array);

        const reals = bins_complex.slice(null, [0,1]).flatten();
        const imags = bins_complex.slice(null, [1,2]).flatten();
        const mirrored_bins = numjs.sqrt(numjs.add(numjs.multiply(reals, reals), numjs.multiply(imags, imags)));
        const bins = mirrored_bins.slice([Math.floor(mirrored_bins.shape[0] / 2)]);
           
        const lower_idx = Math.round((bins.shape[0]) * (this.config.frequency - this.config.tolerance) / this.sampling_rate);
        const upper_idx = Math.round((bins.shape[0]) * (this.config.frequency + this.config.tolerance) / this.sampling_rate);

        const target_mean = numjs.mean(bins.slice([lower_idx, upper_idx]));
        const other_mean = numjs.mean(bins.slice([lower_idx])) + numjs.mean(bins.slice(upper_idx));

        const ratio = target_mean / other_mean;

        if (isNaN(this.activation)) this.activation = ratio;
        else {
            const inertia_constant = (this.sampling_rate / bins.shape[0]) * this.config.inertia;
            this.activation -= this.activation / inertia_constant;
            this.activation += ratio / inertia_constant;
        }
    }

    isRunning(): boolean {
        return this.running;
    }

    activated(): boolean {
        return this.activation >= this.config.threshold;
    }

    getActivation(): number {
        return this.activation;
    }
}