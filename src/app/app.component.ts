import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { BrowserMultiFormatReader } from '@zxing/browser';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements AfterViewInit {
  @ViewChild('video') video!: ElementRef<HTMLVideoElement>;
  scannedBarcodes: string[] = [];

  ngAfterViewInit() {
  const codeReader = new BrowserMultiFormatReader();

  console.log('Starting barcode scanner...');
  console.log('Video element:', this.video);

  navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'environment',
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  }).then((stream) => {
    console.log('Camera stream started.');
    this.video.nativeElement.srcObject = stream;
    this.video.nativeElement.play();

    // Start decoding without restricting formats
    codeReader.decodeFromVideoDevice(undefined, this.video.nativeElement, (result, error) => {
      if (result) {
        const text = result.getText();
        console.log('Decoded:', text);
        if (!this.scannedBarcodes.includes(text)) {
          this.scannedBarcodes.push(text);
        }
      }
      if (error && error.name !== 'NotFoundException') {
        console.error('Scan error:', error);
      }
    });
  }).catch((err) => {
    console.error('Camera error:', err);
  });
}





}
