import { Component, inject, output, signal, computed } from '@angular/core';
import { BookElement } from '../../services/book.service';
import { CommonModule } from '@angular/common';
import { BookService } from '../../services/book.service';

@Component({
  selector: 'app-book-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in">
      <button (click)="close.emit()" class="absolute top-4 right-4 text-white/70 hover:text-white">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div class="relative w-full max-w-6xl h-[80vh] flex items-center justify-center">
        <!-- Previous Page -->
        <button (click)="prevPage()" 
                [disabled]="currentIndex() === 0"
                class="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors z-10">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <!-- Book Page Display -->
        <div class="relative bg-white shadow-2xl overflow-hidden transition-all duration-500"
             style="width: 297mm; height: 210mm; transform: scale(0.8);">
          
          @for (element of currentElements(); track element.id) {
            <div class="absolute"
                 [style.left.px]="element.x"
                 [style.top.px]="element.y"
                 [style.width.px]="element.width"
                 [style.height.px]="element.height"
                 [style.z-index]="element.zIndex">
              
              @if (element.type === 'image') {
                <img [src]="element.src" class="w-full h-full object-cover shadow-sm">
              }
              @if (element.type === 'text') {
                <div class="w-full h-full">{{ element.content }}</div>
              }
            </div>
          }
        </div>

        <!-- Next Page -->
        <button (click)="nextPage()" 
                [disabled]="currentIndex() === pages().length - 1"
                class="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors z-10">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div class="absolute bottom-8 text-white/70 font-medium">
        Page {{ currentIndex() + 1 }} of {{ pages().length }}
      </div>
    </div>
  `
})
export class BookPreviewComponent {
  bookService = inject(BookService);
  close = output<void>();

  pages = this.bookService.pages;
  currentIndex = signal(0);
  
  currentElements = computed(() => {
    const page = this.pages()[this.currentIndex()];
    if (!page) return [];
    const allElements = this.bookService.elements();
    return page.elements
      .map(id => allElements.find(e => e.id === id))
      .filter((e): e is BookElement => !!e);
  });

  nextPage() {
    if (this.currentIndex() < this.pages().length - 1) {
      this.currentIndex.update(i => i + 1);
    }
  }

  prevPage() {
    if (this.currentIndex() > 0) {
      this.currentIndex.update(i => i - 1);
    }
  }
}
