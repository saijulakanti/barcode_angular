import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppComponent } from './app.component';
import { BrowserMultiFormatReader } from '@zxing/browser';

/* ---------------------- shared helpers ---------------------- */

function mockClipboardWriteText(resolve = true) {
  const writeSpy = resolve
    ? jasmine.createSpy('writeText').and.returnValue(Promise.resolve())
    : jasmine.createSpy('writeText').and.returnValue(Promise.reject('deny'));
  spyOnProperty(navigator, 'clipboard', 'get').and.returnValue({ writeText: writeSpy } as any);
  return writeSpy;
}
function makeResult(text: string) { return { getText: () => text } as any; }

/* ------------------------------------------------------------ */

describe('AppComponent (Barcode Scanner)', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;

  // Global spies we can reconfigure per test (prevents double-spy errors)
  let gumSpy: jasmine.Spy<(constraints: MediaStreamConstraints) => Promise<MediaStream>>;
  let playSpy: jasmine.Spy<() => Promise<void>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      imports: [CommonModule],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    // Default behavior (tests can override via .and.returnValue(...))
    gumSpy = spyOn(navigator.mediaDevices, 'getUserMedia')
      .and.returnValue(Promise.resolve(new MediaStream()));
    playSpy = spyOn(HTMLMediaElement.prototype, 'play')
      .and.returnValue(Promise.resolve());

    // Silence logs unless a test asserts them
    spyOn(console, 'log').and.stub();
    spyOn(console, 'error').and.stub();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /* --------------------------- basics --------------------------- */

  it('creates and shows Start Page by default', () => {
    expect(component).toBeTruthy();
    expect(component.showStartPage).toBeTrue();
    expect(fixture.debugElement.query(By.css('.start-page'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('.scanner-page'))).toBeNull();
  });

  /* ------------------------- Start / Back ------------------------- */

  it('Start → shows scanner; Back → returns & clears', async () => {
    const decodeSpy = spyOn(
      BrowserMultiFormatReader.prototype as any, 'decodeFromVideoDevice'
    ).and.callFake((
      _id: string | null | undefined,
      _video: HTMLVideoElement,
      cb: (result: any, error: any) => void
    ) => { cb(makeResult('X1'), null); });

    const startBtn = fixture.debugElement.query(By.css('.start-button')).nativeElement as HTMLButtonElement;
    startBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.showStartPage).toBeFalse();
    expect(component.isScanning).toBeTrue();
    expect(decodeSpy).toHaveBeenCalled(); // at least once

    // give goBack() a stream to stop (tracks may be empty; that’s fine)
    const videoEl = fixture.debugElement.query(By.css('video.scanner-video')).nativeElement as HTMLVideoElement;
    videoEl.srcObject = new MediaStream();

    const backBtn = fixture.debugElement.query(By.css('.back-button')).nativeElement as HTMLButtonElement;
    backBtn.click();
    fixture.detectChanges();

    expect(component.showStartPage).toBeTrue();
    expect(component.isScanning).toBeFalse();
    expect(component.scannedBarcodes.length).toBe(0);
  });

  it('renders empty state when scanning with no results', async () => {
    spyOn(BrowserMultiFormatReader.prototype as any, 'decodeFromVideoDevice')
      .and.callFake((_id: string | null | undefined, _video: HTMLMediaElement, _cb: (r: any, e: any) => void) => {});
    const startBtn = fixture.debugElement.query(By.css('.start-button')).nativeElement as HTMLButtonElement;
    startBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.debugElement.query(By.css('.empty-state'))).toBeTruthy();
  });

  /* ------------------- results & duplicate filter ------------------- */

  it('adds unique scans and ignores duplicates', async () => {
    const decodeSpy = spyOn(BrowserMultiFormatReader.prototype as any, 'decodeFromVideoDevice')
      .and.callFake((
        _id: string | null | undefined,
        _video: HTMLVideoElement,
        cb: (result: any, error: any) => void
      ) => {
        cb(makeResult('ABC'), null);
        cb(makeResult('ABC'), null); // duplicate
        cb(makeResult('XYZ'), null);
      });

    component.startScanning();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(decodeSpy).toHaveBeenCalled(); // don’t assert exact count
    expect(component.scannedBarcodes).toEqual(['ABC', 'XYZ']);
  });

  /* --------------------------- clipboard --------------------------- */

  it('copies barcode to clipboard (success)', async () => {
    const writeSpy = mockClipboardWriteText(true);
    component.copyToClipboard('HELLO-123');
    await fixture.whenStable();
    expect(writeSpy).toHaveBeenCalledWith('HELLO-123');
  });

  it('handles clipboard failure', async () => {
    const writeSpy = mockClipboardWriteText(false);
    component.copyToClipboard('NOPE');

    // Wait for the promise returned by writeText to reject, then assert
    await writeSpy.calls.mostRecent().returnValue.catch(() => {});
    expect(console.error).toHaveBeenCalled();
  });

  /* ------------------------- init branches ------------------------- */

  it('still decodes when video.play() rejects (autoplay)', async () => {
    playSpy.and.returnValue(Promise.reject('autoplay error'));
    const decodeSpy = spyOn(BrowserMultiFormatReader.prototype as any, 'decodeFromVideoDevice')
      .and.callFake((_id: string | null | undefined, _video: HTMLVideoElement, _cb: (r: any, e: any) => void) => {});
    component.startScanning();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(decodeSpy).toHaveBeenCalled();
  });

  it('logs camera error when getUserMedia rejects', async () => {
    gumSpy.and.returnValue(Promise.reject(new DOMException('denied', 'NotAllowedError')));
    const startBtn = fixture.debugElement.query(By.css('.start-button')).nativeElement as HTMLButtonElement;
    startBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(console.error).toHaveBeenCalled(); // "Camera error"
  });

  it('ignores NotFoundException from decoder', async () => {
    const decodeSpy = spyOn(BrowserMultiFormatReader.prototype as any, 'decodeFromVideoDevice')
      .and.callFake((
        _id: string | null | undefined,
        _video: HTMLVideoElement,
        cb: (result: any, error: any) => void
      ) => { cb(null as any, { name: 'NotFoundException' } as any); });

    component.startScanning();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(decodeSpy).toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('logs non-NotFoundException errors from decoder', async () => {
    const decodeSpy = spyOn(BrowserMultiFormatReader.prototype as any, 'decodeFromVideoDevice')
      .and.callFake((
        _id: string | null | undefined,
        _video: HTMLVideoElement,
        cb: (result: any, error: any) => void
      ) => { cb(null as any, { name: 'WeirdError' } as any); });

    component.startScanning();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(decodeSpy).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  /* --------------------------- clear & layout --------------------------- */

  it('clears results when Clear clicked', () => {
    component.showStartPage = false;
    component.isScanning = true;
    component.scannedBarcodes = ['A', 'B'];
    fixture.detectChanges();

    const clearBtn = fixture.debugElement.query(By.css('.clear-button')).nativeElement as HTMLButtonElement;
    clearBtn.click();
    fixture.detectChanges();

    expect(component.scannedBarcodes.length).toBe(0);
  });

  it('places scan instruction below the video within .scanner-container', () => {
    component.showStartPage = false;
    component.isScanning = true;
    fixture.detectChanges();

    const containerEl = fixture.debugElement.query(By.css('.scanner-container')).nativeElement as HTMLElement;
    const children = Array.from(containerEl.children).map(el => (el as HTMLElement).className);

    const idxVideo = children.findIndex(c => c.includes('video-container'));
    const idxInstr = children.findIndex(c => c.includes('scan-instruction'));

    expect(idxVideo).toBeGreaterThan(-1);
    expect(idxInstr).toBeGreaterThan(-1);
    expect(idxInstr).toBeGreaterThan(idxVideo);
  });
});
