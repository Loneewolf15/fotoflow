import { Injectable } from '@angular/core';
import QRCode from 'qrcode';

@Injectable({
  providedIn: 'root'
})
export class QrCodeService {

  constructor() { }

  async generatePersonalizedQrCode(eventId: string, coupleNames: string, themeColors: string[], coverPhotoUrl: string | null, localFile?: File | null): Promise<string> {
    console.log('QrCodeService: Generating QR code. EventId:', eventId);
    const guestViewUrl = `${window.location.origin}/event/${eventId}`;
    let primaryColor = themeColors[0] || '#000000';
    let secondaryColor = themeColors[1] || '#FFFFFF';

    const baseQrCodeUrl = await QRCode.toDataURL(guestViewUrl, {
        errorCorrectionLevel: 'H', type: 'image/png', width: 256, margin: 1,
        color: { dark: primaryColor, light: '#00000000' }
    });

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Could not get canvas context');
    }

    // 1. Fill Background with Secondary Color (White/Theme Light)
    ctx.fillStyle = secondaryColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 2. Draw QR Code
    const image = await this.loadImage(baseQrCodeUrl);
    ctx.drawImage(image, 0, 0);

    // 3. Draw Center Initials
    const centerRectSize = canvas.width * 0.4;
    const centerPos = (canvas.width - centerRectSize) / 2;

    // Draw center background (Solid)
    ctx.fillStyle = secondaryColor;
    ctx.fillRect(centerPos, centerPos, centerRectSize, centerRectSize);

    // Draw Initials
    this.drawInitials(ctx, centerRectSize, primaryColor, coupleNames);
    
    return canvas.toDataURL('image/png');
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      // Only set crossOrigin for non-blob URLs to avoid potential issues
      if (!src.startsWith('blob:')) {
        image.crossOrigin = 'anonymous'; 
      }
      image.onload = () => resolve(image);
      image.onerror = (err) => {
        console.error('Failed to load image for QR code:', src, err);
        reject(err);
      };
      image.src = src;
    });
  }

  private drawInitials(ctx: CanvasRenderingContext2D, centerRectSize: number, color: string, coupleNames: string): void {
    const getInitials = (names: string): string => {
        if (!names) return '';
        return names.split(/and|&/i)
            .map(name => name.trim().charAt(0).toUpperCase())
            .join(' & ');
    };
    const initials = getInitials(coupleNames);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    
    let fontSize = 48;
    ctx.font = `bold ${fontSize}px 'Playfair Display', serif`;

    while (ctx.measureText(initials).width > centerRectSize * 0.9 && fontSize > 10) {
        fontSize--;
        ctx.font = `bold ${fontSize}px 'Playfair Display', serif`;
    }

    ctx.fillText(initials, 256 / 2, 256 / 2);
  }
}
