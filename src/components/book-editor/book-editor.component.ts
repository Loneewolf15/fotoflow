import { Component, inject, signal, ViewChild, ElementRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AngularDraggableModule } from 'angular2-draggable';
import { BookService, BookElement } from '../../services/book.service';
import { PhotoService } from '../../services/photo.service';
import heic2any from 'heic2any';
import { v4 as uuidv4 } from 'uuid';
import { BookPreviewComponent } from './book-preview.component';

@Component({
  selector: 'app-book-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, AngularDraggableModule, BookPreviewComponent],
  templateUrl: './book-editor.component.html',
  styles: [`
    .a4-canvas {
      width: 297mm;
      height: 210mm;
      background: white;
      box-shadow: 0 0 20px rgba(0,0,0,0.1);
      position: relative;
      overflow: hidden;
      transform-origin: top left;
    }
    .sidebar-tab {
      @apply px-4 py-2 cursor-pointer border-b-2 border-transparent hover:text-indigo-600;
    }
    .sidebar-tab.active {
      @apply border-indigo-600 text-indigo-600 font-semibold;
    }
    .element-handle {
      display: none;
    }
    .book-element:hover .element-handle {
      display: block;
    }
  `]
})
export class BookEditorComponent {
  bookService = inject(BookService);
  photoService = inject(PhotoService);

  activeTab = signal<'gallery' | 'uploads'>('gallery');
  uploadedPhotos = signal<string[]>([]);
  showPreview = signal(false);
  zoomLevel = signal(1);
  
  currentElements = computed(() => {
    const page = this.bookService.currentPage();
    if (!page) return [];
    const allElements = this.bookService.elements();
    return page.elements
      .map(id => allElements.find(e => e.id === id))
      .filter((e): e is BookElement => !!e);
  });
  
  @ViewChild('canvasContainer') canvasContainer!: ElementRef;

  constructor() {
    // Auto-scale canvas to fit screen on load/resize
    window.addEventListener('resize', () => this.fitCanvas());
    setTimeout(() => this.fitCanvas(), 100);
  }

  fitCanvas() {
    if (!this.canvasContainer) return;
    const containerWidth = this.canvasContainer.nativeElement.clientWidth;
    // A4 Landscape width is approx 1122px at 96dpi (297mm)
    // Let's assume a base width of 1122px for calculation
    const scale = (containerWidth - 40) / 1122; 
    this.zoomLevel.set(Math.min(scale, 1));
  }

  onDragStart(event: DragEvent, type: 'image', src: string) {
    event.dataTransfer?.setData('type', type);
    event.dataTransfer?.setData('src', src);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault(); // Allow drop
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const type = event.dataTransfer?.getData('type') as 'image' | 'text';
    const src = event.dataTransfer?.getData('src');

    if (type === 'image' && src) {
      this.bookService.addElement({
        id: uuidv4(),
        type: 'photo',
        content: src,
        x: 50,
        y: 50,
        width: 200,
        height: 200,
        rotation: 0,
        zIndex: 1, // You might want to calculate this based on existing elements
        pageId: this.bookService.pages()[0]?.id // Default to first page for now
      });
    }
  }

  async onFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      try {
        let imageUrl: string;
        
        if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
          // Convert HEIC
          const convertedBlob = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.8
          });
          
          // Handle single blob or array
          const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
          imageUrl = URL.createObjectURL(blob);
        } else {
          imageUrl = URL.createObjectURL(file);
        }

        this.uploadedPhotos.update(photos => [imageUrl, ...photos]);
      } catch (error) {
        console.error('Error processing file:', error);
        alert('Could not process this image. Please try a standard JPG or PNG.');
      }
    }
  }

  onElementMove(element: BookElement, position: { x: number, y: number }) {
    this.bookService.updateElement(element.id, { x: position.x, y: position.y });
  }

  onElementResize(element: BookElement, size: { width: number, height: number }) {
    this.bookService.updateElement(element.id, { width: size.width, height: size.height });
  }

  deleteElement(id: string) {
    this.bookService.removeElement(id);
  }
}
