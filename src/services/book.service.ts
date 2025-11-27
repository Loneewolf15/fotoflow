import { Injectable, inject, signal, effect, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
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
  private supabase = inject(SupabaseService).supabase;
  private eventService = inject(EventService);

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
    const { data, error } = await this.supabase
      .from('books')
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (error && error.code !== 'PGRST116') { // Ignore not found error
      console.error("Error loading book:", error);
      return;
    }

    if (data) {
      this._pages.set(data.pages || []);
      this._elements.set(data.elements || []);
    } else {
      // Initialize with one empty page if no book exists
      this.addPage();
    }
  }

  async saveState() {
    const eventId = this.eventService.event()?.id;
    if (!eventId) return;

    const { error } = await this.supabase
      .from('books')
      .upsert({
        event_id: eventId,
        pages: this._pages(),
        elements: this._elements()
      });

    if (error) {
      console.error("Error saving book:", error);
    }
  }

  // ... (Rest of the methods remain largely the same, just ensure they call saveState())
  
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
