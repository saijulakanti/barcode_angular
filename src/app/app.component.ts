import { Component, AfterViewInit, AfterViewChecked, ViewChild, ElementRef } from '@angular/core';
import { BrowserMultiFormatReader } from '@zxing/browser';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit, AfterViewChecked {
  @ViewChild('video') video!: ElementRef<HTMLVideoElement>;
  scannedBarcodes: string[] = [];
  showStartPage = true;
  isScanning = false;
  codeReader: BrowserMultiFormatReader | null = null;

  startScanning() {
    this.showStartPage = false;
    this.isScanning = true;
  }

  goBack() {
    this.showStartPage = true;
    this.isScanning = false;
    this.scannedBarcodes = [];
    
    // Stop the camera stream
    if (this.video?.nativeElement?.srcObject) {
      const stream = this.video.nativeElement.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    
    // Reset the code reader
    if (this.codeReader) {
      // Use a different method to stop the reader since reset() doesn't exist
      this.codeReader = null;
    }
  }

  clearResults() {
    this.scannedBarcodes = [];
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      // You could add a toast notification here
      console.log('Copied to clipboard:', text);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }

  ngAfterViewInit() {
    // Scanner will be initialized when user clicks start
  }

  initializeScanner() {
    if (!this.isScanning) return;
    
    this.codeReader = new BrowserMultiFormatReader();

    console.log('Starting barcode scanner...');

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

      // Start decoding
      this.codeReader!.decodeFromVideoDevice(undefined, this.video.nativeElement, (result, error) => {
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

  ngAfterViewChecked() {
    if (this.isScanning && this.video && !this.video.nativeElement.srcObject) {
      setTimeout(() => this.initializeScanner(), 100);
    }
  }
}