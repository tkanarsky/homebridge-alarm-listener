import numjs = require('numjs');
import Analyzer = require('audio-analyser');
import mic = require('mic');
import { ExampleHomebridgePlatform } from './platform';

export class Detector {

    activation: number;
    sampling_rate: number;

    constructor(
        private readonly platform: ExampleHomebridgePlatform,
        private readonly device: string,
        private readonly freq: number, 
        private readonly tolerance: number,
        private readonly decay: number,
        private readonly thresh: number,
    ) {
        this.activation = NaN;
        this.sampling_rate = 16000;
        const microphone = mic({
            rate: this.sampling_rate.toString(),
            device: this.device,
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
        // console.log(fft_array);
        // const fft_array = numjs.concatenate(data_array, numjs.zeros([data_array.shape, 1]))
        const bins_complex = numjs.fft(fft_array);
        const reals = bins_complex.slice(null, [0,1]).flatten();
        // console.log(bins_complex);
        // console.log(reals);
        const imags = bins_complex.slice(null, [1,2]).flatten();
        // console.log(imags);
        const mirrored_bins = numjs.sqrt(numjs.add(numjs.multiply(reals, reals), numjs.multiply(imags, imags)));

        const bins = mirrored_bins.slice([Math.floor(mirrored_bins.shape[0] / 2)]);
            // console.log(bins.shape[0]);
        
        const lower_idx = Math.round((bins.shape[0]) * (this.freq - this.tolerance) / this.sampling_rate);
        const upper_idx = Math.round((bins.shape[0]) * (this.freq + this.tolerance) / this.sampling_rate);


        const target_mean = numjs.mean(bins.slice([lower_idx, upper_idx]));
        const other_mean = numjs.mean(bins.slice([lower_idx])) + numjs.mean(bins.slice(upper_idx));

        const ratio = target_mean / other_mean;


        if (isNaN(this.activation)) this.activation = ratio;
        else {
            const decay_constant = (this.sampling_rate / bins.shape[0]) * this.decay;
            this.activation -= this.activation / decay_constant;
            this.activation += ratio / decay_constant;
        }
    }

    activated() {
        return this.activation >= this.thresh;
    }
}