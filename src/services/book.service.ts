import { Injectable, inject, signal, effect, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { firstValueFrom } from 'rxjs';
import { EventService } from './event.service';

export interface Page {
  id: string;
  elements: string[]; // IDs of elements on this page
  background?: string;
}

export interface BookElement {
  id: string;
  type: 'photo' | 'text' | 'sticker';
  content: string; // URL for photo/sticker, text content for text
  note?: string; // Optional note from the guest
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  pageId: string;
}

@Injectable({
  providedIn: 'root'
})
export class BookService {
  private eventService = inject(EventService);
  private http = inject(HttpClient);

  private readonly _pages = signal<Page[]>([]);
  public readonly pages = this._pages.asReadonly();

  private readonly _elements = signal<BookElement[]>([]);
  public readonly elements = this._elements.asReadonly();

  private readonly _selectedElementId = signal<string | null>(null);
  public readonly selectedElementId = this._selectedElementId.asReadonly();

  private readonly _currentPageIndex = signal<number>(0);
  public readonly currentPageIndex = this._currentPageIndex.asReadonly();

  public readonly currentPage = computed(() => this.pages()[this.currentPageIndex()] || null);
  public readonly canGoPrev = computed(() => this.currentPageIndex() > 0);
  public readonly canGoNext = computed(() => this.currentPageIndex() < this.pages().length - 1);

  constructor() {
    effect(() => {
      const event = this.eventService.event();
      if (event && event.id) {
        this.loadBook(event.id);
      } else {
        this._pages.set([]);
        this._elements.set([]);
      }
    });
  }

  async loadBook(eventId: string) {
    try {
      const response = await firstValueFrom(this.http.get<{ status: boolean, data: any }>(
        `${environment.backendUrl}/books/get/${eventId}`
      ));

      if (response.status && response.data) {
        this._pages.set(response.data.pages || []);
        this._elements.set(response.data.elements || []);
      } else {
        // Initialize with one empty page if no book exists
        this.initializeNewBook();
      }
    } catch (error) {
      console.error("Error loading book:", error);
      // Initialize with one empty page on error (or not found)
      this.initializeNewBook();
    }
  }

  private initializeNewBook() {
    const event = this.eventService.event();
    const coverUrl = event?.coverPhotoUrl;

    const pageId = crypto.randomUUID();
    const newPage: Page = {
      id: pageId,
      elements: []
    };

    this._pages.set([newPage]);

    if (coverUrl) {
      // Add cover photo as a full-page background element
      const coverElement: BookElement = {
        id: crypto.randomUUID(),
        type: 'photo',
        content: coverUrl,
        x: 0,
        y: 0,
        width: 1122, // Approx A4 width in px at 96dpi
        height: 793, // Approx A4 height
        rotation: 0,
        zIndex: 0,
        pageId: pageId
      };
      this.addElement(coverElement);
    } else {
      this.saveState();
    }
  }

  async saveState() {
    const eventId = this.eventService.event()?.id;
    if (!eventId) return;

    const payload = {
      event_id: eventId,
      pages: this._pages(),
      elements: this._elements()
    };

    try {
      await firstValueFrom(this.http.post<{ status: boolean, message: string }>(
        `${environment.backendUrl}/books/save`,
        payload
      ));
    } catch (error) {
      console.error("Error saving book:", error);
    }
  }

  addPage() {
    const newPage: Page = {
      id: crypto.randomUUID(),
      elements: []
    };
    this._pages.update(pages => [...pages, newPage]);
    this.saveState();
  }

  addElement(element: BookElement) {
    this._elements.update(elements => [...elements, element]);
    this._pages.update(pages => pages.map(p =>
      p.id === element.pageId
        ? { ...p, elements: [...p.elements, element.id] }
        : p
    ));
    this.saveState();
  }

  updateElement(id: string, changes: Partial<BookElement>) {
    this._elements.update(elements => elements.map(el =>
      el.id === id ? { ...el, ...changes } : el
    ));
    this.saveState();
  }

  removeElement(id: string) {
    const element = this._elements().find(e => e.id === id);
    if (!element) return;

    this._elements.update(elements => elements.filter(e => e.id !== id));
    this._pages.update(pages => pages.map(p =>
      p.id === element.pageId
        ? { ...p, elements: p.elements.filter(eid => eid !== id) }
        : p
    ));
    this.saveState();
  }

  selectElement(id: string | null) {
    this._selectedElementId.set(id);
  }

  nextPage() {
    if (this.canGoNext()) {
      this._currentPageIndex.update(i => i + 1);
    }
  }

  prevPage() {
    if (this.canGoPrev()) {
      this._currentPageIndex.update(i => i - 1);
    }
  }
}
