import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiFailure } from '../../core/models/api.model';
import { ContentBlock, ContentPayload } from '../../core/models/content.model';
import { ContentService } from '../../core/services/content.service';
import { I18nService } from '../../core/services/i18n.service';
import { ToastService } from '../../core/services/toast.service';

/** One editable leaf inside a content block. */
interface Field {
  /** Path within the block value, e.g. `items.0.title`. */
  path: string;
  label: string;
  /** Long values get a textarea. */
  multiline: boolean;
  en: string;
  ar: string;
}

/** A repeated entry (a stat, a capability, a social link). */
interface RepeatGroup {
  key: string;
  label: string;
  rows: Array<{ index: number; fields: Field[] }>;
  /** Field names a new row should start with. */
  template: string[];
}

interface EditableBlock {
  key: string;
  group: string;
  label: string;
  fields: Field[];
  repeats: RepeatGroup[];
}

const GROUP_ORDER = ['home', 'about', 'contact', 'footer', 'general'];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Turns `headlineLine1` into `Headline line 1`. */
const humanise = (key: string): string =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/([0-9]+)/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());

/**
 * Site content editor.
 *
 * The content API stores arbitrary JSON per block, which keeps the schema
 * stable as copy evolves — but it means this screen cannot be a fixed form.
 * It reads the *shape* of each stored block and renders controls to match:
 * strings become inputs, string arrays become editable lists, arrays of
 * objects become repeatable field sets. A new field added to the seed appears
 * here automatically, with no change to this component.
 */
@Component({
  selector: 'app-admin-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './admin-content.component.html',
  styleUrl: './admin-content.component.scss',
})
export class AdminContentComponent {
  protected readonly i18n = inject(I18nService);
  private readonly content = inject(ContentService);
  private readonly toasts = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly savingKey = signal<string | null>(null);
  protected readonly blocks = signal<EditableBlock[]>([]);
  protected readonly activeGroup = signal<string>('home');

  protected readonly groups = computed(() => {
    const present = new Set(this.blocks().map((block) => block.group));
    return GROUP_ORDER.filter((group) => present.has(group));
  });

  protected readonly visibleBlocks = computed(() =>
    this.blocks().filter((block) => block.group === this.activeGroup()),
  );

  constructor() {
    this.load();
  }

  protected groupLabel(group: string): string {
    const labels = this.i18n.dict().admin.content.groups as Record<string, string>;
    return labels[group] ?? humanise(group);
  }

  private load(): void {
    this.loading.set(true);
    this.content.load(true).subscribe({
      next: () => {
        const parsed = this.content.blocks().map((block) => this.toEditable(block));
        this.blocks.set(parsed);
        this.activeGroup.set(parsed[0]?.group ?? 'home');
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // --- Shape → editable model ----------------------------------------------

  private toEditable(block: ContentBlock): EditableBlock {
    const en = isPlainObject(block.valueEn) ? block.valueEn : { value: block.valueEn };
    const ar = isPlainObject(block.valueAr) ? block.valueAr : { value: block.valueAr };

    const fields: Field[] = [];
    const repeats: RepeatGroup[] = [];

    for (const [key, enValue] of Object.entries(en)) {
      const arValue = ar[key];

      if (Array.isArray(enValue)) {
        repeats.push(this.toRepeat(key, enValue, Array.isArray(arValue) ? arValue : []));
        continue;
      }

      if (isPlainObject(enValue)) {
        // One level of nesting is flattened with a dotted path; deeper shapes
        // are not used by this site and would only clutter the form.
        for (const [childKey, childValue] of Object.entries(enValue)) {
          const arChild = isPlainObject(arValue) ? arValue[childKey] : '';
          fields.push(
            this.toField(`${key}.${childKey}`, `${humanise(key)} — ${humanise(childKey)}`, childValue, arChild),
          );
        }
        continue;
      }

      fields.push(this.toField(key, humanise(key), enValue, arValue));
    }

    return {
      key: block.key,
      group: block.group,
      label: this.i18n.localize(block, 'label') || humanise(block.key.replace(/\./g, ' ')),
      fields,
      repeats,
    };
  }

  private toRepeat(key: string, enItems: unknown[], arItems: unknown[]): RepeatGroup {
    const rows: RepeatGroup['rows'] = [];
    const template = new Set<string>();

    enItems.forEach((enItem, index) => {
      const arItem = arItems[index];

      if (isPlainObject(enItem)) {
        const fields = Object.entries(enItem).map(([childKey, childValue]) => {
          template.add(childKey);
          const arValue = isPlainObject(arItem) ? arItem[childKey] : '';
          return this.toField(`${key}.${index}.${childKey}`, humanise(childKey), childValue, arValue);
        });
        rows.push({ index, fields });
      } else {
        // Array of plain strings — e.g. About's paragraphs.
        rows.push({
          index,
          fields: [this.toField(`${key}.${index}`, `${humanise(key)} ${index + 1}`, enItem, arItem)],
        });
      }
    });

    return { key, label: humanise(key), rows, template: [...template] };
  }

  private toField(path: string, label: string, enValue: unknown, arValue: unknown): Field {
    const en = enValue === null || enValue === undefined ? '' : String(enValue);
    const ar = arValue === null || arValue === undefined ? '' : String(arValue);
    return { path, label, multiline: en.length > 90 || ar.length > 90, en, ar };
  }

  // --- Editable model → payload ---------------------------------------------

  /** Rebuilds the nested JSON from the flat field paths. */
  private toValue(block: EditableBlock, locale: 'en' | 'ar'): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    const write = (path: string, value: string) => {
      const segments = path.split('.');
      let cursor: Record<string, unknown> | unknown[] = result;

      segments.forEach((segment, depth) => {
        const last = depth === segments.length - 1;
        const nextIsIndex = /^\d+$/.test(segments[depth + 1] ?? '');
        const index = /^\d+$/.test(segment) ? Number(segment) : null;

        if (last) {
          if (index !== null) (cursor as unknown[])[index] = value;
          else (cursor as Record<string, unknown>)[segment] = value;
          return;
        }

        const container = index !== null ? (cursor as unknown[])[index] : (cursor as Record<string, unknown>)[segment];
        const created = container ?? (nextIsIndex ? [] : {});

        if (index !== null) (cursor as unknown[])[index] = created;
        else (cursor as Record<string, unknown>)[segment] = created;

        cursor = created as Record<string, unknown> | unknown[];
      });
    };

    for (const field of block.fields) write(field.path, field[locale]);
    for (const repeat of block.repeats) {
      for (const row of repeat.rows) {
        for (const field of row.fields) write(field.path, field[locale]);
      }
    }

    return result;
  }

  protected save(block: EditableBlock): void {
    this.savingKey.set(block.key);

    const payload: ContentPayload = {
      key: block.key,
      group: block.group,
      valueEn: this.toValue(block, 'en'),
      valueAr: this.toValue(block, 'ar'),
    };

    this.content.save([payload]).subscribe({
      next: () => {
        this.savingKey.set(null);
        this.toasts.success(this.i18n.dict().admin.content.saved);
      },
      error: (failure: ApiFailure) => {
        this.savingKey.set(null);
        this.toasts.error(failure.message);
      },
    });
  }

  // --- Repeat row management -------------------------------------------------

  protected addRow(block: EditableBlock, repeat: RepeatGroup): void {
    const index = repeat.rows.length;

    const fields: Field[] = repeat.template.length
      ? repeat.template.map((childKey) =>
          this.toField(`${repeat.key}.${index}.${childKey}`, humanise(childKey), '', ''),
        )
      : [this.toField(`${repeat.key}.${index}`, `${repeat.label} ${index + 1}`, '', '')];

    repeat.rows.push({ index, fields });
    this.blocks.update((list) => [...list]);
  }

  protected removeRow(block: EditableBlock, repeat: RepeatGroup, rowIndex: number): void {
    repeat.rows.splice(rowIndex, 1);
    // Paths encode the array index, so they have to be renumbered after a removal.
    repeat.rows.forEach((row, newIndex) => {
      row.index = newIndex;
      row.fields.forEach((field) => {
        const tail = field.path.split('.').slice(2).join('.');
        field.path = tail ? `${repeat.key}.${newIndex}.${tail}` : `${repeat.key}.${newIndex}`;
      });
    });
    this.blocks.update((list) => [...list]);
  }
}
